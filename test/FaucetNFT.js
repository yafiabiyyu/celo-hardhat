const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("Faucet NFT Test", function() {
    let owner;
    let user1;
    let user2;
    before(async function (){
        this.FaucetNFT = await ethers.getContractFactory('FaucetNFT');
    });
    this.beforeEach(async function (){
        [owner, user1, user2] = await ethers.getSigners();
        this.contract = await this.FaucetNFT.deploy("test");
        await this.contract.deployed();
    })
    it("User request NFT Faucet", async function(){
        await this.contract.connect(owner).faucetNFT();
        expect(await this.contract.balanceOf(owner.address)).to.equal(1);
    });

    it("User transfer NFT to another user", async function(){
        await this.contract.connect(owner).faucetNFT();
        await this.contract.connect(owner).transferFrom(owner.address, user1.address, 0);
        expect(await this.contract.balanceOf(owner.address)).to.equal(0);
        expect(await this.contract.balanceOf(user1.address)).to.equal(1);
    });

    it("Give NFT Approve to the owner address", async function(){
        await this.contract.connect(owner).faucetNFT();
        await expect(
            this.contract.connect(owner).approve(owner.address, 0)
        ).to.be.revertedWith("ERC721: approval to current owner");
    })

    it("NFT transfer to zero address", async function(){
        await this.contract.connect(owner).faucetNFT();
        await expect(
            this.contract.connect(owner).transferFrom(owner.address, "0x0000000000000000000000000000000000000000", 0)
        ).to.be.revertedWith("ERC721: transfer to the zero address");
    })

    it("Transfer NFT that is not owned by the owner", async function(){
        await this.contract.connect(owner).faucetNFT();
        await this.contract.connect(user1).faucetNFT();
        await expect(this.contract.connect(owner).transferFrom(owner.address, user1.address, 1)).to.be.revertedWith("ERC721: caller is not token owner nor approved");
    });
});