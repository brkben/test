//SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "./Relayer/BasicMetaTransaction.sol";
import "./interfaces/ISFTTemplate.sol";
import "./interfaces/INFTTemplate.sol";

contract SingleMarket is EIP712Upgradeable, BasicMetaTransaction {
    bytes32 public constant HEFTYVERSE_SELLER_HASH =
        0x51578850e098d13a094707a5ac92c49e129a0105cf9dd73242d806c6226cb33b;
    bytes32 public constant HEFTYVERSE_BUYER_HASH =
        0xa5d11765150653576a9e54747c7f8320f9efd3015db18555ba41dcc88980b8f7;

    struct HeftyVerseSeller {
        address nftAddress; // Address of the NFT contract
        address owner; // Owner of the NFT
        uint256 tokenID; // Token ID of the NFT
        uint256 amount; // Amount of the NFT to be sold
        uint256 minPrice; // Minimum secondary sale price of the NFT
        uint256 counter; // Unique counter of the HeftyVerseSeller
        bool isFixedPrice; // Bool to check if it is fixed price sale or auction
        bool isCustodial; // Bool to check if the wallet is custodial or non-custodail
        bytes signature; // Signature created after signing HeftyVerseSeller
    }

    struct HeftyVerseBuyer {
        address nftAddress; // Address of the NFT contract
        address buyer; // Address of the Buyer of the NFT
        uint256 tokenID; // Token ID of the NFT
        uint256 amount; // Amount of the NFT to be bought
        uint256 pricePaid; // Price paid for the NFT
        uint256 counter; // Unique counter of the HeftyVerseSeller
        bool isCustodial; // Bool to check if the wallet is custodial or non-custodail
        bytes signature; // Signature created after signing HeftyVerseBuyer
    }

    // Admin address of the contract
    address public admin;

    // Token to buy NFTs
    IERC20Upgradeable public token;

    // Marketing address for fee
    address public marketWallet;

    // Treasury address
    address public treasury;

    // Marketplace fee in bps
    uint public marketFee = 200;

    // Mapping for used counter numbers
    mapping(uint256 => bool) public usedCounters;

    // Mapping of the counter to the amount left in voucher
    mapping(uint256 => uint256) public amountLeft;

    event AmountDistributed(
        address indexed buyer,
        uint amountPaid,
        uint royaltyPaid,
        uint marketFeePaid
    );
    event TokenWithdrawn(uint256 _amount);

    /**
     * @dev Initializes the contract by setting a `owner`, `marketingWallet`, `treasury` and `token` for the marketplace
     * @param _owner is set as the owner for Marketplace contract
     * @param _marketWallet is set as the wallet for marketplace fee
     * @param _token is set as the token using which NFTs will be bought
     * @param _treasury is set as the address from which funds will be used during custodial buy.
     */
    function initialize(
        address _owner,
        address _marketWallet,
        address _token,
        address _treasury
    ) external initializer {
        __EIP712_init("Heftyverse_MarketItem", "1");

        admin = _owner;
        marketWallet = _marketWallet;
        treasury = _treasury;
        token = IERC20Upgradeable(_token);
    }

    /**
     * @dev `buyer` and `seller` will be used in case of secondary sell
     * @dev `seller` and `_voucher` will be used in case of primary sell
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param _voucher is a SFTvoucher describing an unminted NFT
     * @param _voucherNFT is a NFTvoucher describing an unminted NFT
     * @param is721NFT is to check if token is NFT or SFT
     */
    function Buy(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        Voucher.SFTvoucher memory _voucher,
        Voucher.NFTvoucher memory _voucherNFT,
        bool is721NFT
    ) external {
        //Prices invalid
        require(seller.minPrice <= buyer.pricePaid, "PI");
        verifyVoucherCreators(buyer, seller, _voucher, _voucherNFT, is721NFT);

        if (buyer.isCustodial == true && seller.isCustodial == true)
            BuyCustodial2Custodial(
                buyer,
                seller,
                _voucher,
                _voucherNFT,
                is721NFT
            );
        else if (buyer.isCustodial == true && seller.isCustodial == false)
            BuyNonCustodial2Custodial(
                buyer,
                seller,
                _voucher,
                _voucherNFT,
                is721NFT
            );
        else if (buyer.isCustodial == false && seller.isCustodial == true)
            BuyCustodial2NonCustodial(
                buyer,
                seller,
                _voucher,
                _voucherNFT,
                is721NFT
            );
        else
            BuyNonCustodial2NonCustodial(
                buyer,
                seller,
                _voucher,
                _voucherNFT,
                is721NFT
            );
    }

    /**
     * @notice Function to reset the counter for a voucher
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     */
    function resetCounter(HeftyVerseSeller memory seller) external {
        require(msg.sender == seller.owner, "NA"); //not owner
        amountLeft[seller.counter] = 0;
        usedCounters[seller.counter] = true;
    }

    /**
     * @notice Function to set new token for buy/sell in the marketplace
     * @param _token is the new token which will be used for buy/sell in the marketplace
     */
    function setToken(address _token) external {
        //not admin
        require(msg.sender == admin, "NA");
        //zero address
        require(_token != address(0), "ZA");
        token = IERC20Upgradeable(_token);
    }

    /**
     * @notice Function to set new address for market wallet
     * @param _wallet is the new wallet address where marketplace fee will be sent
     */
    function setMarketingWallet(address _wallet) external {
        // not admin
        require(msg.sender == admin, "NA");
        //zero address
        require(_wallet != address(0), "ZA");
        marketWallet = _wallet;
    }

    /**
     * @notice Function to set new address for treasury wallet
     * @param _wallet is the new wallet address where marketplace fee will be sent
     */
    function settreasury(address _wallet) external {
        // not admin
        require(msg.sender == admin, "NA");
        //zero address
        require(_wallet != address(0), "ZA");
        treasury = _wallet;
    }

    /**
     * @notice Function to set new marketplace fee in bps
     * @param _fee is the new marketplace fee
     */
    function setMarketFee(uint _fee) external {
        // not admin
        require(msg.sender == admin, "NA");
        //invalid Value
        require(_fee <= 10000, "IV");
        marketFee = _fee;
    }

    /**
     * @notice Function to withdraw stuck tokens from the contract
     * @param _token is the token to be withdrawn
     * @param _isMatic is to check if matic is removed
     */
    function withdrawStuckToken(address _token,bool _isMatic) external {
        uint256 _amount;
        if(_isMatic){
            _amount = IERC20Upgradeable(_token).balanceOf(address(this));
            IERC20Upgradeable(_token).transfer(admin, _amount);
        } else {
            _amount = address(this).balance;
            (bool success, ) = admin.call{value: _amount}("");
            require(success,"NS");
        }
        emit TokenWithdrawn(_amount);
    }

    /**
     * @notice Function to set new admin of the contract
     * @param _admin is the new admin of the contract
     */
    function transferAdminRole(address _admin) external {
        require(msg.sender == admin, "NA"); // not admin
        //zero address
        require(_admin != address(0), "ZA");
        admin = _admin;
    }

    /**
     * @notice Returns a hash of the given HeftyVerseSeller, prepared using EIP712 typed data hashing rules.
     * @param seller is a HeftyVerseSeller to hash.
     */
    function _hashSeller(HeftyVerseSeller memory seller)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        HEFTYVERSE_SELLER_HASH,
                        seller.nftAddress,
                        seller.owner,
                        seller.tokenID,
                        seller.amount,
                        seller.minPrice,
                        seller.counter,
                        seller.isFixedPrice,
                        seller.isCustodial
                    )
                )
            );
    }

    /**
     * @notice Verifies the signature for a given HeftyVerseSeller, returning the address of the signer.
     * @dev Will revert if the signature is invalid. Does not verify that the signer is owner of the NFT.
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     */
    function _verifySeller(HeftyVerseSeller memory seller)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hashSeller(seller);
        return ECDSAUpgradeable.recover(digest, seller.signature);
    }

    /**
     * @notice Returns a hash of the given HeftyVerseBuyer, prepared using EIP712 typed data hashing rules.
     * @param buyer is a HeftyVerseBuyer to hash.
     */
    function _hashBuyer(HeftyVerseBuyer memory buyer)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        HEFTYVERSE_BUYER_HASH,
                        buyer.nftAddress,
                        buyer.buyer,
                        buyer.tokenID,
                        buyer.amount,
                        buyer.pricePaid,
                        buyer.counter,
                        buyer.isCustodial
                    )
                )
            );
    }

    /**
     * @notice Verifies the signature for a given HeftyVerseBuyer, returning the address of the signer.
     * @dev Will revert if the signature is invalid.
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     */
    function _verifyBuyer(HeftyVerseBuyer memory buyer)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hashBuyer(buyer);
        return ECDSAUpgradeable.recover(digest, buyer.signature);
    }

    /**
     * @notice This is the internal view function used to verify th signers of buyer and seller for secondary sale of NFT
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param _voucher is a SFTvoucher describing an unminted NFT
     * @param _voucherNFT is a NFTvoucher describing an unminted NFT
     * @param is721Nft is to check if token is NFT or SFT
     */
    function verifyVoucherCreators(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        Voucher.SFTvoucher memory _voucher,
        Voucher.NFTvoucher memory _voucherNFT,
        bool is721Nft
    ) internal view {
        //invalid Seller
        require(seller.owner == _verifySeller(seller), "ISA");
        // invalid Buyer
        require(buyer.buyer == _verifyBuyer(buyer), "IB");
        if (is721Nft) {
            // Address Invalid
            require(
                buyer.nftAddress == _voucherNFT.nftAddress &&
                    seller.nftAddress == _voucherNFT.nftAddress,
                "AI"
            );
            //Prices invalid
            require(_voucherNFT.price <= buyer.pricePaid, "PI");
            //Amounts invalid
            require(buyer.amount <= seller.amount, "AMI");
        } else {
            // Address Invalid
            require(
                buyer.nftAddress == _voucher.nftAddress &&
                    seller.nftAddress == _voucher.nftAddress,
                "AI"
            );
            // Price Invalid
            require(_voucher.price <= buyer.pricePaid, "PI");
            // Counter Invalid
            require(buyer.counter == seller.counter, "CI");
        }
    }

    function _msgSender()
        internal
        view
        override(BasicMetaTransaction)
        returns (address sender)
    {
        return super._msgSender();
    }

    /**
     * @notice This is the internal function used in case if both buyer and seller are custodial wallets
     * @dev `buyer` and `seller` will be used in case of secondary sell
     * @dev `seller` and `_voucher` will be used in case of primary sell
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param _voucher is a SFTVoucher describing an unminted NFT
     * @param _voucherNFT is a NFTvoucher describing an unminted NFT
     * @param is721NFT is to check if token is NFT or SFT
     */
    function BuyCustodial2Custodial(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        Voucher.SFTvoucher memory _voucher,
        Voucher.NFTvoucher memory _voucherNFT,
        bool is721NFT
    ) internal {
        if (!_voucher.toMint || !_voucherNFT.toMint) {
            setCounter(buyer, seller);

            // royalty given
            uint royaltyAmount = sendRoyalty(buyer, seller, is721NFT, true);

            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, true);
            //nft transfer
            if (is721NFT) {
                INFTTemplate(seller.nftAddress).transferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID
                );
            } else {
                ISFTTemplate(seller.nftAddress).safeTransferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID,
                    buyer.amount,
                    ""
                );
            }
            emit AmountDistributed(
                buyer.buyer,
                buyer.pricePaid,
                royaltyAmount,
                fee
            );
        } else {
            //verifyPrimary(seller, buyer, _voucher);

            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, true);
            // token redeeming
            if (is721NFT) {
                token.transferFrom(
                    treasury,
                    INFTTemplate(seller.nftAddress).creator(),
                    buyer.pricePaid - fee
                );
                INFTTemplate(seller.nftAddress).redeem(
                    _voucherNFT,
                    buyer.buyer
                );
            } else {
                token.transferFrom(
                    treasury,
                    ISFTTemplate(seller.nftAddress).creator(),
                    buyer.pricePaid - fee
                );
                setCounter(buyer, seller);
                ISFTTemplate(seller.nftAddress).redeem(
                    _voucher,
                    buyer.buyer,
                    buyer.amount
                );
            }

            emit AmountDistributed(buyer.buyer, buyer.pricePaid, 0, fee);
        }
    }

    /**
     * @notice This is the internal function used in case if seller is a custodial wallet and buyer is non-custodial wallet
     * @dev `buyer` and `seller` will be used in case of secondary sell
     * @dev `seller` and `_voucher` will be used in case of primary sell
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param _voucher is a SFTVoucher describing an unminted NFT
     * @param _voucherNFT is a NFTvoucher describing an unminted NFT
     * @param is721NFT is to check if token is NFT or SFT
     */
    function BuyCustodial2NonCustodial(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        Voucher.SFTvoucher memory _voucher,
        Voucher.NFTvoucher memory _voucherNFT,
        bool is721NFT
    ) internal {
        if (!_voucher.toMint || !_voucherNFT.toMint) {
            setCounter(buyer, seller);

            // royalty given
            uint royaltyAmount = sendRoyalty(buyer, seller, is721NFT, false);

            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, false);

            //payment transfer
            token.transferFrom(
                buyer.buyer,
                treasury,
                buyer.pricePaid - (royaltyAmount + fee)
            );
            // nft transfer
            if (is721NFT)
                INFTTemplate(seller.nftAddress).transferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID
                );
            else
                ISFTTemplate(seller.nftAddress).safeTransferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID,
                    buyer.amount,
                    ""
                );

            emit AmountDistributed(
                buyer.buyer,
                buyer.pricePaid,
                royaltyAmount,
                fee
            );
        } else {
            //verifyPrimary(seller, buyer, _voucher);

            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, false);
            // token redeeming
            if (is721NFT) {
                token.transferFrom(
                    buyer.buyer,
                    INFTTemplate(seller.nftAddress).creator(),
                    buyer.pricePaid - fee
                );
                INFTTemplate(seller.nftAddress).redeem(
                    _voucherNFT,
                    buyer.buyer
                );
            } else {
                token.transferFrom(
                    buyer.buyer,
                    ISFTTemplate(seller.nftAddress).creator(),
                    buyer.pricePaid - fee
                );
                setCounter(buyer, seller);
                ISFTTemplate(seller.nftAddress).redeem(
                    _voucher,
                    buyer.buyer,
                    buyer.amount
                );
            }

            emit AmountDistributed(buyer.buyer, buyer.pricePaid, 0, fee);
        }
    }

    /**
     * @notice This is the internal function used in case if seller is a non-custodial wallet and buyer is custodial wallet
     * @dev `buyer` and `seller` will be used in case of secondary sell
     * @dev `seller` and `_voucher` will be used in case of primary sell
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param _voucher is a SFTVoucher describing an unminted NFT
     * @param _voucherNFT is a NFTvoucher describing an unminted NFT
     * @param is721NFT is to check if token is NFT or SFT
     */
    function BuyNonCustodial2Custodial(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        Voucher.SFTvoucher memory _voucher,
        Voucher.NFTvoucher memory _voucherNFT,
        bool is721NFT
    ) internal {
        if (!_voucher.toMint || !_voucherNFT.toMint) {
            setCounter(buyer, seller);

            // royalty given
            uint royaltyAmount = sendRoyalty(buyer, seller, is721NFT, true);

            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, true);
            //payment transfer
            token.transferFrom(
                treasury,
                seller.owner,
                buyer.pricePaid - (royaltyAmount + fee)
            );
            //nft transfer
            if (is721NFT)
                INFTTemplate(seller.nftAddress).transferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID
                );
            else
                ISFTTemplate(seller.nftAddress).safeTransferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID,
                    buyer.amount,
                    ""
                );

            emit AmountDistributed(
                buyer.buyer,
                buyer.pricePaid,
                royaltyAmount,
                fee
            );
        } else {
            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, true);
            // token redeeming
            if (is721NFT) {
                INFTTemplate(seller.nftAddress).redeem(
                    _voucherNFT,
                    buyer.buyer
                );
            } else {
                setCounter(buyer, seller);
                ISFTTemplate(seller.nftAddress).redeem(
                    _voucher,
                    buyer.buyer,
                    buyer.amount
                );
            }

            emit AmountDistributed(buyer.buyer, buyer.pricePaid, 0, fee);
        }
    }

    /**
     * @notice This is the internal function used in case if seller is a non-custodial wallet and buyer is also non-custodial wallet
     * @dev `buyer` and `seller` will be used in case of secondary sell
     * @dev `seller` and `_voucher` will be used in case of primary sell
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param _voucher is a SFTVoucher describing an unminted SFT
     * @param _voucherNFT is a NFTVoucher describing an unminted NFT
     * @param is721NFT is to check if token is NFT or SFT
     */
    function BuyNonCustodial2NonCustodial(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        Voucher.SFTvoucher memory _voucher,
        Voucher.NFTvoucher memory _voucherNFT,
        bool is721NFT
    ) internal {
        if (!_voucher.toMint || !_voucherNFT.toMint) {
            setCounter(buyer, seller);

            // royalty given
            uint royaltyAmount = sendRoyalty(buyer, seller, is721NFT, false);

            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, false);
            //payment transfer
            token.transferFrom(
                buyer.buyer,
                seller.owner,
                buyer.pricePaid - (royaltyAmount + fee)
            );
            //nft transfer
            if (is721NFT)
                INFTTemplate(seller.nftAddress).transferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID
                );
            else
                ISFTTemplate(seller.nftAddress).safeTransferFrom(
                    seller.owner,
                    buyer.buyer,
                    seller.tokenID,
                    buyer.amount,
                    ""
                );

            emit AmountDistributed(
                buyer.buyer,
                buyer.pricePaid,
                royaltyAmount,
                fee
            );
        } else {
            //market fee deducted
            uint fee = takeMarketplaceFee(buyer, false);
            //payment transfer
            token.transferFrom(
                buyer.buyer,
                seller.owner,
                buyer.pricePaid - fee
            );
            // token redeeming
            if (is721NFT) {
                INFTTemplate(seller.nftAddress).redeem(
                    _voucherNFT,
                    buyer.buyer
                );
            } else {
                setCounter(buyer, seller);
                ISFTTemplate(seller.nftAddress).redeem(
                    _voucher,
                    buyer.buyer,
                    buyer.amount
                );
            }

            emit AmountDistributed(buyer.buyer, buyer.pricePaid, 0, fee);
        }
    }

    /**
     * @notice This is the internal view function used to set the counter for the seller
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     */
    function setCounter(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller
    ) internal {
        //Counter used
        require(!usedCounters[seller.counter], "CU");
        uint256 leftCounter = amountLeft[seller.counter];
        if (leftCounter == 0) {
            leftCounter = seller.amount - buyer.amount;
        } else {
            leftCounter = leftCounter - buyer.amount;
        }
        require(leftCounter >= 0, "ALZ"); //Amount left less than zero
        if (leftCounter == 0) usedCounters[seller.counter] = true;
    }

    /**
     * @notice This is the internal view function used to send the royalty during the secondary sale
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param seller is a HeftyVerseSeller describing the NFT to be sold
     * @param is721NFT is to check if token is NFT or SFT
     * @param fromTreasury is to check if royalty is sent from treasury or buyer
     */
    function sendRoyalty(
        HeftyVerseBuyer memory buyer,
        HeftyVerseSeller memory seller,
        bool is721NFT,
        bool fromTreasury
    ) internal returns (uint) {
        address receiver;
        uint royaltyAmount;
        if (is721NFT) {
            //not owner
            require(
                INFTTemplate(seller.nftAddress).ownerOf(seller.tokenID) ==
                    seller.owner,
                "NO"
            );
            (receiver, royaltyAmount) = INFTTemplate(seller.nftAddress)
                .royaltyInfo(seller.tokenID, buyer.pricePaid);
        } else {
            //not owner
            require(
                ISFTTemplate(seller.nftAddress).balanceOf(
                    seller.owner,
                    seller.tokenID
                ) >= buyer.amount,
                "NO"
            );
            (receiver, royaltyAmount) = ISFTTemplate(seller.nftAddress)
                .royaltyInfo(seller.tokenID, buyer.pricePaid);
        }

        if (fromTreasury) token.transferFrom(treasury, receiver, royaltyAmount);
        else token.transferFrom(buyer.buyer, receiver, royaltyAmount);

        return royaltyAmount;
    }

    /**
     * @notice This is the internal view function used to deduct the marketplace fee
     * @param buyer is a HeftyVerseBuyer describing the NFT to be bought
     * @param fromTreasury is to check if royalty is sent from treasury or buyer
     */
    function takeMarketplaceFee(HeftyVerseBuyer memory buyer, bool fromTreasury)
        internal
        returns (uint)
    {
        uint fee = (buyer.pricePaid * marketFee) / 10000;
        if (fromTreasury) token.transferFrom(treasury, marketWallet, fee);
        else token.transferFrom(buyer.buyer, marketWallet, fee);

        return fee;
    }
}
