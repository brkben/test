//SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "./Relayer/BasicMetaTransaction.sol";
import "./libraries/VoucherLib.sol";
import "./interfaces/IFactory.sol";

contract Template721 is
    ERC721URIStorageUpgradeable,
    ERC2981Upgradeable,
    EIP712Upgradeable,
    BasicMetaTransaction
{
    bytes32 public constant NFT_VOUCHER_HASH =
        0xba13abdcfb157da68ba26009f3433110b6b0994f0bd8a8fd0f30ca63e01be4d6;

    // Admin of the contract
    address public admin;

    // Creator of the NFT
    address public creator;

    // Factory contract address
    address public factory;

    // Max Supply
    uint public maxSupply;

    // Total Supply
    uint public totalSupply;

    // Event for token withdraw
    event TokenWithdrawn(uint256 _amount);


    /**
     * @notice Initializes the contract by setting a `admin`, `creator`and `factory` for the contract
     * @param _name is set as the name of the deployed ERC721
     * @param _symbol is set as the symbol of the deployed ERC721
     * @param _creator is set as the admin of the deployed ERC1155 which will be the creator itself
     * @param _admin is set as the second admin of the deployed ERC1155 which will be the platform owner
     * @param _factory is set as the factory address
     * @param _maxSupply is set as the maximum supply
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _creator,
        address _admin,
        address _factory,
        uint _maxSupply
    ) external initializer {
        __ERC721_init(_name, _symbol);
        __ERC721URIStorage_init();
        __ERC2981_init();
        __EIP712_init("HeftyVerse_NFT_Voucher", "1");

        admin = _admin;
        creator = _creator;
        factory = _factory;
        maxSupply = _maxSupply;
    }

    /**
     * @notice Redeems an NFTvoucher for an actual NFT, creating it in the process.
     * @param redeemer The address of the account which will receive the NFT upon success.
     * @param _voucher A signed NFTvoucher that describes the NFT to be redeemed.
     */
    function redeem(Voucher.NFTvoucher memory _voucher, address redeemer)
        external
    {
        require(_voucher.nftAddress == address(this), "IA"); //invalid address
        address signer = _verify(_voucher);
        require(signer == admin || signer == creator, "IS"); //invalid signer
        MintNFT(
            signer,
            _voucher.tokenId,
            _voucher.tokenUri,
            _voucher.royaltyKeeper,
            _voucher.royaltyFees
        );
        transferFrom(signer, redeemer, _voucher.tokenId);
    }

    /**
     * @notice Function to withdraw stuck tokens from the contract
     * @param _token is the token to be withdrawn
     * @param  isMatic is to check if matic needed to withdrawn
     */
    function withdrawStuckToken(address _token, bool isMatic) external {
        uint256 _amount;
        if(isMatic) {
            _amount = address(this).balance;
            (bool success,) = admin.call{value : _amount}("");
            // not successfull
            require(success,"NS");
        } else {
            _amount = IERC20Upgradeable(_token).balanceOf(address(this));
            IERC20Upgradeable(_token).transfer(admin, _amount);
        }
        emit TokenWithdrawn(_amount);
    }

    /**
     * @notice Function to change the admin of the contract
     * @param _admin is the new admin address
     */
    function setAdmin(address _admin) external {
        require(msg.sender == admin, "NA"); //not admin
        require(_admin != address(0), "ZA"); //zero address
        admin = _admin;
    }

    /**
     * @notice Function to change the creator of the contract
     * @param _creator is the new admin address
     */
    function setCreator(address _creator) external {
        require(msg.sender == admin, "NA"); //not admin
        require(_creator != address(0), "ZA"); //zero address
        creator = _creator;
    }

    /**
     * @notice View function to check if the NFT exists or not
     * @param tokenId is the tokenID whose existance has to be checked
     */
    function exists(uint tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @notice Standard transferFrom function is modified to bypass the check for approval if msg sender is marketplace
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        if (msg.sender != IFactory(factory).marketplace())
            require(
                _isApprovedOrOwner(_msgSender(), tokenId),
                "ERC721: caller is not token owner nor approved"
            );

        _transfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Returns a hash of the given NFTvoucher, prepared using EIP712 typed data hashing rules.
     * @param voucher is a NFTvoucher to hash.
     */
    function _hash(Voucher.NFTvoucher memory voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        NFT_VOUCHER_HASH,
                        voucher.nftAddress,
                        voucher.tokenId,
                        voucher.price,
                        keccak256(bytes(voucher.tokenUri)),
                        voucher.toMint,
                        voucher.royaltyKeeper,
                        voucher.royaltyFees
                    )
                )
            );
    }

    /**
     * @notice Verifies the signature for a given NFTvoucher, returning the address of the signer.
     * @dev Will revert if the signature is invalid.
     * @param voucher is a NFTvoucher describing the NFT to be bought
     */
    function _verify(Voucher.NFTvoucher memory voucher)
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
     * @param tokenURI is the URI of the token
     * @param royaltyKeeper is the address to which the royalty will be sent
     * @param royaltyFees is the royalty percentage in bps
     */
    function MintNFT(
        address to,
        uint256 tokenId,
        string memory tokenURI,
        address royaltyKeeper,
        uint96 royaltyFees
    ) internal {
        require(totalSupply < maxSupply, "Template721: max limit exceed");
        _safeMint(to, tokenId, "");
        _setTokenURI(tokenId, tokenURI);
        totalSupply++;

        if (royaltyKeeper != address(0)) {
            _setTokenRoyalty(tokenId, royaltyKeeper, royaltyFees);
        }
    }
}
