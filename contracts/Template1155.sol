//SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "contracts/Relayer/BasicMetaTransaction.sol";
import "contracts/libraries/VoucherLib.sol";
import "contracts/interfaces/IFactory.sol";

contract Template1155 is
    ERC1155URIStorageUpgradeable,
    ERC2981Upgradeable,
    EIP712Upgradeable,
    BasicMetaTransaction
{
    bytes32 public constant SFT_VOUCHER_HASH =
        0xfff075b1c892595cd22c001e3cc055f20114946aa21ad68c4930d4ffcf2a25ed;

    // Admin of the contract
    address public admin;

    // Creator of the NFT
    address public creator;

    // Factory contract address
    address public factory;

    // Mapping of the counters that has been redeemed
    mapping(uint256 => bool) public redeemedCounter;

    // Mapping of the counter to the amount left in voucher
    mapping(uint256 => uint256) public amountLeft;

    /**
     * @notice Initializes the contract by setting a `admin`, `creator`, `factory` and `token` for the contract
     * @param uri is set as the uri of the deployed ERC1155
     * @param _creator is set as the admin of the deployed ERC1155 which will be the creator itself
     * @param _admin is set as the second admin of the deployed ERC1155 which will be the platform owner
     * @param _factory is set as the factory address
     */
    function initialize(
        string memory uri,
        address _creator,
        address _admin,
        address _factory
    ) external initializer {
        __ERC1155_init(uri);
        __ERC1155URIStorage_init();
        __ERC2981_init();
        __EIP712_init("HeftyVerse_NFT_Voucher", "1");

        admin = _admin;
        creator = _creator;
        factory = _factory;
    }

    /**
     * @notice Function to change the admin of the contract
     * @param _admin is the new admin address
     */
    function setAdmin(address _admin) external {
        
        require(msg.sender == admin, "NA");//Not Admin
        require(_admin != address(0));
        admin = _admin;
    }

    /**
     * @notice Function to change the creator of the contract
     * @param _creator is the new admin address
     */
    function setCreator(address _creator) external {
        require(msg.sender == admin, "NA");//Not Admin
        require(_creator != address(0));
        creator = _creator;
    }

    /**
     * @notice Redeems an SFTvoucher for an actual SFT, creating it in the process.
     * @param redeemer The address of the account which will receive the SFT upon success.
     * @param _voucher A signed SFTvoucher that describes the SFT to be redeemed.
     */
    function redeem(
        Voucher.SFTvoucher calldata _voucher,
        address redeemer,
        uint amount
    ) external {
        require(!redeemedCounter[_voucher.counter],"VU");//Voucher Used
        require(_voucher.nftAddress == address(this),"IA");//Invalid address
        address signer = _verify(_voucher);
        require(signer == admin || signer == creator);

        uint left = amountLeft[_voucher.counter];
        // Handling counter and amount
        if (left == 0) {
            left = _voucher.amount - amount;
        } else {
            left = left - amount;
        }

        if (left == 0) redeemedCounter[_voucher.counter] = true;

        amountLeft[_voucher.counter] = left;

        MintNFT(
            signer,
            _voucher.tokenId,
            amount,
            _voucher.tokenUri,
            _voucher.royaltyKeeper,
            _voucher.royaltyFees
        );
        safeTransferFrom(
            signer,
            redeemer,
            _voucher.tokenId,
            amount,
            ""
        );
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Standard safeTransferFrom function is modified to bypass the check for approval if msg sender is marketplace
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        if (msg.sender != IFactory(factory).marketplace())
            require(
                from == _msgSender() || isApprovedForAll(from, _msgSender()),
                "ERC1155: not approved"
            );
        _safeTransferFrom(from, to, id, amount, data);
    }

    /**
     * @notice Standard safeBatchTransferFrom function is modified to bypass the check for approval if msg sender is marketplace
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        if (msg.sender != IFactory(factory).marketplace())
            require(
                from == _msgSender() || isApprovedForAll(from, _msgSender()),
                "ERC1155: not approved"
            );
        _safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    /**
     * @notice Returns a hash of the given SFTvoucher, prepared using EIP712 typed data hashing rules.
     * @param voucher is a SFTvoucher to hash.
     */
    function _hash(Voucher.SFTvoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        SFT_VOUCHER_HASH,
                        voucher.nftAddress,
                        voucher.tokenId,
                        voucher.price,
                        voucher.amount,
                        voucher.counter,
                        keccak256(bytes(voucher.tokenUri)),
                        voucher.toMint,
                        voucher.royaltyKeeper,
                        voucher.royaltyFees
                    )
                )
            );
    }

    /**
     * @notice Verifies the signature for a given SFTvoucher, returning the address of the signer.
     * @dev Will revert if the signature is invalid.
     * @param voucher is a SFTvoucher describing the SFT to be bought
     */
    function _verify(Voucher.SFTvoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSAUpgradeable.recover(digest, voucher.signature);
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, BasicMetaTransaction)
        returns (address sender)
    {
        return super._msgSender();
    }

    /**
     * @notice This is an internal function modified to mint the NFT and set the token URI and royalty info
     * @param to is the address to which NFT will be minted
     * @param tokenId is the ID of the NFT to be minted
     * @param mintAmount is the amount of tokens to be minted of the same tokenID
     * @param tokenURI is the URI of the token
     * @param royaltyKeeper is the address to which the royalty will be sent
     * @param royaltyFees is the royalty percentage in bps
     */
    function MintNFT(
        address to,
        uint256 tokenId,
        uint256 mintAmount,
        string memory tokenURI,
        address royaltyKeeper,
        uint96 royaltyFees
    ) internal {
        _mint(to, tokenId, mintAmount, "");
        _setURI(tokenId, tokenURI);
        if (royaltyKeeper != address(0)) {
            _setTokenRoyalty(tokenId, royaltyKeeper, royaltyFees);
        }
    }
}
