// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

library Voucher {
    struct NFTvoucher{
        address nftAddress;     // Address of the NFT contract
        uint256 tokenId;        // Token ID of the NFT
        uint256 price;          // Primary sale price of the NFT
        string tokenUri;        // Token URI of the NFT
        bool toMint;            // Bool to check if voucher is used for minting 
        address royaltyKeeper;  // Royalty Receiver address
        uint96 royaltyFees;     // Royalty percentage
        bytes signature;        // Signature created after signing NFTvoucher
    }

    struct SFTvoucher{
        address nftAddress;     // Address of the SFT contract
        uint256 tokenId;        // Token ID of the SFT
        uint256 price;          // Primary sale price of the SFT
        uint256 amount;         // No. of copies of the SFT
        uint256 counter;        // Uniques counter of the voucher
        string tokenUri;        // Token URI of the SFT
        bool toMint;            // Bool to check if voucher is used for minting 
        address royaltyKeeper;  // Royalty Receiver address
        uint96 royaltyFees;     // Royalty percentage
        bytes signature;        // Signature created after signing SFTvoucher
    }}