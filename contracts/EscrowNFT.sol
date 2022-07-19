// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract EscrowNFT is Ownable {
    using SafeMath for uint256;
    uint256 public platformFee;
    uint256 private escrowIdDigit = 8;
    uint256 private escrowIdMod = 10**escrowIdDigit;
    bytes32 private idHash;

    enum Payment {
        Celo,
        Stable,
        Token
    }

    enum Status {
        Pending,
        Accept,
        Reject,
        Canceled
    }

    struct EscrowData {
        uint256 tokenId;
        uint256 paymentAmount;
        address nftAddress;
        address paymentAddress;
        address buyerAddress;
        address sellerAddress;
        Payment payment;
        Status status;
    }
    EscrowData escrowData;

    mapping(uint256 => EscrowData) public idToEscrow;

    event NewEscrow(
        uint256 _escrowId,
        uint256 _tokenId,
        address _nftAddress,
        address _sellerAddress,
        address _buyerAddress
    );

    event NewCancle(uint256 _escrowId, uint256 _tokenId, address _sellerAddress);

    modifier validateTokenId(uint256 _tokenId, address _nftAddress) {
        require(_nftAddress != address(0), "Escrow: Invalid NFT Address");
        require(msg.sender == IERC721(_nftAddress).ownerOf(_tokenId));
        _;
    }

    modifier onlySeller(uint256 _escrowId) {
        require(msg.sender == idToEscrow[_escrowId].sellerAddress);
        _;
    }

    constructor(uint256 _platformFee, bytes32 _initIdHash) {
        platformFee = _platformFee;
        idHash = _initIdHash;
    }

    function updateFeePlatform(uint256 _feePlatform) external onlyOwner {
        require(_feePlatform > 0, "Escrow: Fee must be greater than 0");
        platformFee = _feePlatform;
    }

    function updateIdHash(bytes32 _idHash) external onlyOwner {
        idHash = keccak256(abi.encodePacked(idHash, _idHash));
    }

    function createEscrow(
        uint256 _tokenId,
        uint256 _paymentAmount,
        address _nftAddress,
        address _paymentAddress,
        address _buyerAddress,
        Payment _payment
    ) external validateTokenId(_tokenId, _nftAddress) {
        require(_paymentAmount > 0, "Escrow: Payment amount must be greater than 0");
        require(_paymentAddress != address(0), "Escrow: Invalid Payment Address");
        require(_buyerAddress != address(0), "Escrow: Invalid Buyer Address");
        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _tokenId);
        uint256 escrowId = _genEscrowId(
            _tokenId,
            _nftAddress,
            msg.sender,
            _buyerAddress
        );
        escrowData.tokenId = _tokenId;
        escrowData.paymentAmount = _paymentAmount;
        escrowData.nftAddress = _nftAddress;
        escrowData.buyerAddress = _buyerAddress;
        escrowData.sellerAddress = msg.sender;
        escrowData.status = Status.Pending;
        escrowData.payment = _payment;
        if (_payment == Payment.Celo) {
            escrowData.paymentAddress = address(this);
        } else {
            escrowData.paymentAddress = _paymentAddress;
        }
        idToEscrow[escrowId] = escrowData;
        emit NewEscrow(
            escrowId,
            _tokenId,
            _nftAddress,
            msg.sender,
            _buyerAddress
        );
    }

    function cancleEscrow(uint256 _escrowId) external onlySeller(_escrowId) {
        require(idToEscrow[_escrowId].status == Status.Pending, "Escrow: Invalid Escrow ID");
        address nftAddress = idToEscrow[_escrowId].nftAddress;
        idToEscrow[_escrowId].status = Status.Canceled;
        idToEscrow[_escrowId].nftAddress = address(0);
        IERC721(nftAddress).safeTransferFrom(address(this), msg.sender, idToEscrow[_escrowId].tokenId);
        emit NewCancle(_escrowId, idToEscrow[_escrowId].tokenId, msg.sender);
    }

    function _genEscrowId(
        uint256 _tokenId,
        address _nftAddress,
        address _seller,
        address _buyer
    ) private view returns (uint256 escrowId) {
        escrowId =
            uint256(
                keccak256(
                    abi.encodePacked(
                        idHash,
                        _tokenId,
                        _nftAddress,
                        _seller,
                        _buyer
                    )
                )
            ) %
            escrowIdMod;
    }
}
