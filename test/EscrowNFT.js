const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("Escrow NFT: Owner Test", function () {
    let owner;
    let nonOwner;

    before(async function () {
        this.EscrowNFT = await ethers.getContractFactory('EscrowNFT');
        this.FaucetNFT = await ethers.getContractFactory('FaucetNFT');
        this.FaucetToken = await ethers.getContractFactory('FaucetToken');
    });

    this.beforeEach(async function () {
        [, nonOwner] = await ethers.getSigners();
        // Deploy contract
        this.nft = await this.FaucetNFT.deploy("");
        this.token = await this.FaucetToken.deploy()
        this.escrow = await this.EscrowNFT.deploy(20, ethers.utils.soliditySha256(['string'],['yafiabiyyu']));
        await this.nft.deployed();
        await this.token.deployed();
        await this.escrow.deployed();
    });

    it("Owner update fee platform", async function(){
        await this.escrow.updateFeePlatform(30);
        expect(await this.escrow.platformFee()).to.be.equal(30);
    });

    it("Revert non Owner update fee platform", async function(){
        await expect(this.escrow.connect(nonOwner).updateFeePlatform(30)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Revert update fee with 0", async function(){
        await expect(this.escrow.updateFeePlatform(0)).to.be.revertedWith("Escrow: Fee must be greater than 0");
    });
});

describe("Escrow NFT: Seller & Buyer Test", function(){
    let seller;
    let buyer;
    let paymentAmount;

    before(async function () {
        this.EscrowNFT = await ethers.getContractFactory('EscrowNFT');
        this.FaucetNFT = await ethers.getContractFactory('FaucetNFT');
        this.FaucetToken = await ethers.getContractFactory('FaucetToken');
    });

    this.beforeEach(async function () {
        paymentAmount = await ethers.utils.parseEther('0.5');
        [seller, buyer] = await ethers.getSigners();

        // Deploy contract
        this.nft = await this.FaucetNFT.deploy("");
        this.token = await this.FaucetToken.deploy()
        this.escrow = await this.EscrowNFT.deploy(20, ethers.utils.soliditySha256(['string'],['yafiabiyyu']));
        await this.nft.deployed();
        await this.token.deployed();
        await this.escrow.deployed();

        // Initial Seller balance
        await this.nft.connect(seller).faucetNFT();
        await this.nft.connect(seller).approve(this.escrow.address, 0);

        // Initial Buyer balance
        await this.token.connect(buyer).faucetToken();
        await this.token.connect(buyer).approve(this.escrow.address, paymentAmount);
    });

    it("Create New Escrow", async function(){
        const tx = await this.escrow.connect(seller).createEscrow(
            0,
            paymentAmount,
            this.nft.address,
            this.token.address,
            buyer.address,
            2
        );
        const receipt = await tx.wait();
        const escrowId = receipt.events[2].args._escrowId.toNumber();
        const escrowData = await this.escrow.connect(seller).idToEscrow(escrowId);

        expect(await this.nft.balanceOf(this.escrow.address)).to.be.equal(1);
        expect(await this.nft.ownerOf(0)).to.be.equal(this.escrow.address);
        expect(escrowData[0]).to.be.equal(0)
        expect(escrowData[1]).to.be.equal(paymentAmount);
        expect(escrowData[2]).to.be.equal(this.nft.address);
        expect(escrowData[3]).to.be.equal(this.token.address);
        expect(escrowData[4]).to.be.equal(buyer.address);
        expect(escrowData[5]).to.be.equal(seller.address);
        expect(escrowData[6]).to.be.equal(2);
        expect(escrowData[7]).to.be.equal(0);
    });

    it("Revert create a new escrow with an invalid token id", async function(){
        await expect(
            this.escrow.connect(seller).createEscrow(
                1,
                paymentAmount,
                this.nft.address,
                this.token.address,
                buyer.address,
                2
            )
        ).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Revert create a new escrow with payment zero address", async function(){
        await expect(
            this.escrow.connect(seller).createEscrow(
                0,
                paymentAmount,
                this.nft.address,
                '0x0000000000000000000000000000000000000000',
                buyer.address,
                2
            )
        ).to.be.revertedWith("Escrow: Invalid Payment Address")
    });

    it("Revert create new escrow with zero address buyer", async function(){
        await expect(
            this.escrow.connect(seller).createEscrow(
                0,
                paymentAmount,
                this.nft.address,
                this.token.address,
                '0x0000000000000000000000000000000000000000',
                2
            )
        ).to.be.revertedWith("Escrow: Invalid Buyer Address")
    })
})