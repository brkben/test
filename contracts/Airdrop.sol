//SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "contracts/Relayer/BasicMetaTransaction.sol";
import "contracts/libraries/VoucherLib.sol";
import "contracts/interfaces/IFactory.sol";

contract Airdrop is
    ERC1155URIStorageUpgradeable,
    ERC2981Upgradeable,
    EIP712Upgradeable,
    BasicMetaTransaction
{
    // Admin of the contract
    address public admin;

    // Creator of the NFT
    address public creator;

    // Factory contract address
    address public factory;

    // Event for token withdraw
    event TokenWithdrawn(uint256 _amount);

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
        string calldata tokenURI,
        address royaltyKeeper,
        uint96 royaltyFees
    ) external {
        // not admin
        require(_msgSender() == admin, "NA");
        _mint(to, tokenId, mintAmount, "");
        _setURI(tokenId, tokenURI);
        if (royaltyKeeper != address(0)) {
            _setTokenRoyalty(tokenId, royaltyKeeper, royaltyFees);
        }
    }

    /**
     * @notice Function to withdraw stuck tokens from the contract
     * @param _token is the token to be withdrawn
     * @param  isMatic is to check if matic needed to withdrawn
     */
    function withdrawStuckToken(address _token, bool isMatic) external {
        uint256 _amount;
        if (isMatic) {
            _amount = address(this).balance;
            (bool success, ) = admin.call{value: _amount}("");
            // not successfull
            require(success, "NS");
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
        require(_msgSender() == admin, "NA");
        require(_admin != address(0));
        admin = _admin;
    }

    /**
     * @notice Function to change the creator of the contract
     * @param _creator is the new admin address
     */
    function setCreator(address _creator) external {
        require(_msgSender() == admin, "NA");
        require(_creator != address(0));
        creator = _creator;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
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

    function bulkTransfer(
        address from,
        address[] memory to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: not approved"
        );
        // invalid length
        require(to.length == ids.length && ids.length == amounts.length, "IL");
        for (uint i = 0; i < to.length; i++) {
            _safeTransferFrom(from, to[i], ids[i], amounts[i], "");
        }
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, BasicMetaTransaction)
        returns (address sender)
    {
        return super._msgSender();
    }
}
