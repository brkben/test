import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers} from "hardhat";
import Web3 from "web3";
import {
  Template721,
  Template721__factory,
  TokenFactory,
  TokenFactory__factory,
  Usd,
  Usd__factory,
  Template1155,
  Template1155__factory,
  SingleMarket,
  SingleMarket__factory,
  OwnedUpgradeabilityProxy,
  OwnedUpgradeabilityProxy__factory,
} from "../typechain";
import LazyMinting from "./utilities/LazyMinting";
import SellerVoucher from "./utilities/SellerVoucher";
import BuyerVoucher from "./utilities/BuyerVoucher";

import { expandTo18Decimals, expandTo6Decimals } from "./utilities/utilities";
import { expect } from "chai";
import template1155Voucher from "./utilities/SFTVoucher";
import { UsdInterface } from "../typechain/Usd";
import { sign } from "crypto";
import hardhatConfig from "../hardhat.config";
import { messagePrefix } from "@ethersproject/hash";
import { Provider } from "@ethersproject/abstract-provider";

describe("Template", async () => {
  let NFT: Template721;
  let factory: TokenFactory;
  let owner: SignerWithAddress;
  let superOwner: SignerWithAddress;
  let signers: SignerWithAddress[];
  let usdt: Usd;
  let template1155: Template1155;
  let singleMarketplace: SingleMarket;
  let proxy: OwnedUpgradeabilityProxy;
  const hre = require("hardhat");

  var web3Object = new Web3(hre.network.provider);
 
  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];
    superOwner = signers[1];
    NFT = await new Template721__factory(owner).deploy();
    template1155 = await new Template1155__factory(owner).deploy();
    usdt = await new Usd__factory(owner).deploy();
    factory = await new TokenFactory__factory(owner).deploy();
    proxy = await new OwnedUpgradeabilityProxy__factory(owner).deploy();
    // factory = await new TokenFactory__factory(owner).attach(proxy.addrress);
    singleMarketplace = await new SingleMarket__factory(owner).deploy();
    await usdt.initialize("USDT","USD");
    
    await singleMarketplace.initialize(
      owner.address,
      owner.address,
      usdt.address,
      owner.address
    );
    await singleMarketplace.connect(owner).setToken(usdt.address);

    await NFT.initialize(
      "testName",
      "testSymbol",
      owner.address,
      superOwner.address,
      factory.address,
      3
    );
    await template1155.initialize(
      "testURI",
      owner.address,
      signers[1].address,
      factory.address
    );
    await factory
      .connect(owner)
      .initialize(NFT.address,template1155.address,singleMarketplace.address);

    await usdt.mint(signers[1].address, expandTo6Decimals(100));
  });

  describe("Single Market place: 721 NFT", async () => {
    it("custodial to custodial", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);

      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });

      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
    
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      let nonce = await web3Object.eth.getTransactionCount(signers[6].address);
     
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const TemplateVoucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );

      
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      

      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);
      await singleMarketplace.Buy(
        buyerVoucher2,
        sellerVoucher2,
        voucher2,
        voucherNFT2,
        true
      );
      expect(await TRS.balanceOf(signers[7].address)).to.be.eq(1);
    });

 
    it("custodial to non-custodial", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const TemplateVoucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );

      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(10000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);
      await singleMarketplace.Buy(
        buyerVoucher2,
        sellerVoucher2,
        voucher2,
        voucherNFT2,
        true
      );
      
      expect(await TRS.balanceOf(signers[7].address)).to.be.eq(1);
    });

    it("ERROR: custodial to non-custodial, price invalid", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(7),
        1,
        true,
        true
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(7),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await expect(singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      )).to.be.revertedWith("PI");

    });

    it("predict NFT Contract Address", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      await factory.connect(owner).predictNFTContractAddress("name",TRS.address,signers[2].address,1);
    });

    it("custodial to non-custodial, balance check ", async () => {
      await factory
      .connect(owner)
      .create721Token(
        "TestName",
        "TestSymbol",
        owner.address,
        signers[1].address,
        3
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address, 0);
    const TRS = await new Template721__factory(owner).attach(Tseries);

    //creating vouchers
    const TemplateVoucher = await new LazyMinting({
      _contract: TRS,
      _signer: signers[1],
    });
    const voucherNFT = await TemplateVoucher.createVoucher(
      Tseries,
      1,
      expandTo6Decimals(10),
      "TestURI",
      true,
      signers[2].address,
      expandTo6Decimals(0)
    );
    const Template1155Voucher = await new template1155Voucher({
      _contract: TRS,
      _signer: signers[1],
    });
    const voucher = await Template1155Voucher.createVoucher(
      Tseries,
      1,
      expandTo6Decimals(10),
      1,
      1,
      "TestURI",
      true,
      signers[2].address,
      expandTo6Decimals(0)
    );
    const seller = new SellerVoucher({
      _contract: singleMarketplace,
      _signer: signers[1],
    });
    const sellerVoucher = await seller.createVoucher(
      Tseries,
      signers[1].address,
      1,
      1,
      expandTo6Decimals(10),
      1,
      true,
      true
    );
    const buyer = await new BuyerVoucher({
      _contract: singleMarketplace,
      _signer: signers[6],
    });
    const buyerVoucher = await buyer.createVoucher(
      Tseries,
      signers[6].address,
      1,
      1,
      expandTo6Decimals(10),
      1,
      await web3Object.eth.getTransactionCount(signers[6].address),
      false
    );

    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(10000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));

    await singleMarketplace.Buy(
      buyerVoucher,
      sellerVoucher,
      voucher,
      voucherNFT,
      true
    );
    expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);


    await TRS.connect(signers[6]).transferFrom(signers[6].address, signers[9].address, 1);

      //Secondary buy
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucherNFT2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const TemplateVoucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );

      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(10000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect (singleMarketplace.Buy(
        buyerVoucher2,
        sellerVoucher2,
        voucher2,
        voucherNFT2,
        true
      )).to.be.revertedWith("NO");
    });




    it("non-custodial to custodial", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const TemplateVoucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );

      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(10000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);
      await singleMarketplace.Buy(
        buyerVoucher2,
        sellerVoucher2,
        voucher2,
        voucherNFT2,
        true
      );
      expect(await TRS.balanceOf(signers[7].address)).to.be.eq(1);
    });

    it("non-custodial to non-custodial", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const TemplateVoucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );

      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(10000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);
      await singleMarketplace.Buy(
        buyerVoucher2,
        sellerVoucher2,
        voucher2,
        voucherNFT2,
        true
      );
      expect(await TRS.balanceOf(signers[7].address)).to.be.eq(1);
    });

    //revert cases

    it("ERROR: Wrong nft Addresses in buyer and seller vouchers", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token("T-series", "TSR", owner.address, superOwner.address,3);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        signers[5].address,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("AI");
    });
    it("ERROR: Price paid and price of nft doesn't match", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(9),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("PI");
    });

    it("ERROR: Counters of vouchers doesn't match", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(9),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("PI");
    });

    it("ERROR: Amounts of vouchers doesn't match", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(9),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("PI");
    });

    //Custodial to custodial


    it("ERROR: Signature of buyer not matching at primary buy(C2C)", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR: Signature of seller not matching at secondary buy(C2C)", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);
      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR: Signature of buyer not matching at secondary buy(C2C)", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[5].address),
        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IB");
    });

    // //custodial to non-custodial

    it("ERROR: Signature of buyer not matching at primary buy(C2N)", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR: Signature of seller not matching at secondary buy(C2N)", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR: Signature of buyer not matching at secondary buy(C2N)", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[5].address),
        false
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IB");
    });

    // //non-custodial to custodial

    it("ERROR: Signature of buyer not matching at primary buy(N2C)", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR: Signature of seller not matching at secondary buy(N2C)", async () => {
      //
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR: Signature of buyer not matching at secondary buy(N2C)", async () => {
      //
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[5].address),
        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IB");
    });

    // non-custodial to non-custodial

    it("ERROR: Signature of buyer not matching at primary buy(N2N)", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR: Signature of seller not matching at secondary buy(N2N)", async () => {
      //
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[7].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR: Signature of buyer not matching at secondary buy(N2N)", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const buyerVoucher = await buyer.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );

      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(10000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await singleMarketplace.Buy(
        buyerVoucher,
        sellerVoucher,
        voucher,
        voucherNFT,
        true
      );
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const seller2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const sellerVoucher2 = await seller2.createVoucher(
        Tseries,
        signers[6].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyer2 = await new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const buyerVoucher2 = await buyer2.createVoucher(
        Tseries,
        signers[5].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[5].address),
        false
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(
          buyerVoucher2,
          sellerVoucher2,
          voucher2,
          voucherNFT2,
          true
        )
      ).to.be.revertedWith("IB");
    });

    //setter function test cases

    it("updating token address", async () => {
      await singleMarketplace.setToken(signers[4].address);
      expect(await singleMarketplace.token()).to.be.eq(signers[4].address);
      await expect(
        singleMarketplace.connect(signers[5]).setToken(signers[4].address)
      ).to.be.revertedWith("NA");
      await expect(
        singleMarketplace.connect(owner).setToken(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZA");
    });

    it("updating market wallet address", async () => {
      await singleMarketplace.setWallet(signers[4].address,true);
      expect(await singleMarketplace.marketWallet()).to.be.eq(
        signers[4].address
      );

      await expect(
        singleMarketplace
          .connect(signers[5])
          .setWallet(signers[4].address,true)
      ).to.be.revertedWith("NA");
      await expect(
        singleMarketplace
          .connect(owner)
          .setWallet(ethers.constants.AddressZero,true)
      ).to.be.revertedWith("ZA");
    });

    it("Updating treasury wallet address", async () => {
      await singleMarketplace.setWallet(signers[4].address,false);
      expect(await singleMarketplace.treasury()).to.be.eq(signers[4].address);

      await expect(
        singleMarketplace.connect(signers[5]).setWallet(signers[4].address,false)
      ).to.be.revertedWith("NA");
      await expect(
        singleMarketplace
          .connect(owner)
          .setWallet(ethers.constants.AddressZero,false)
      ).to.be.revertedWith("ZA");
    });

    it("Updating market fee amount", async () => {
      await singleMarketplace.setMarketFee(2);
      expect(await singleMarketplace.marketFee()).to.be.eq(2);
      await expect(
        singleMarketplace.connect(signers[4]).setMarketFee(10000)
      ).to.be.revertedWith("NA");
      await expect(
        singleMarketplace.connect(owner).setMarketFee(100000)
      ).to.be.revertedWith("IV");
    });

    it("transferring admin", async () => {
      await singleMarketplace
        .connect(owner)
        .transferAdminRole(signers[4].address);
      expect(await singleMarketplace.admin()).to.be.eq(signers[4].address);
      await expect(
        singleMarketplace
          .connect(signers[5])
          .transferAdminRole(signers[4].address)
      ).to.be.revertedWith("NA");
      await expect(
        singleMarketplace
          .connect(signers[4])
          .transferAdminRole(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZA");
    });

    it("Reset Counter", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address,
          3
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      const seller = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[1],
      });
      const sellerVoucher = await seller.createVoucher(
        Tseries,
        signers[1].address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      await singleMarketplace.connect(owner).resetCounter(sellerVoucher);
      await expect(
        singleMarketplace.connect(signers[4]).resetCounter(sellerVoucher)
      ).to.be.revertedWith("NA");
    });

    it("Withdrawing stuck token", async () => {
      let balancebefore = await usdt.balanceOf(owner.address);
      await usdt
        .connect(owner)
        .transfer(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.connect(owner).withdrawStuckToken(usdt.address, false);
      expect(await usdt.balanceOf(owner.address)).to.be.eq(balancebefore);
    });
  });

  describe("Template 721 test cases", async () => {
    it("Withdrawing stuck token", async () => {
      let balancebefore = await usdt.balanceOf(owner.address);
      await usdt
        .connect(owner)
        .transfer(singleMarketplace.address, expandTo6Decimals(1000));
      await NFT.connect(owner).withdrawStuckToken(usdt.address, false);
     // expect(await usdt.balanceOf(owner.address)).to.be.eq(balancebefore);
    });
    it("Redeem functionality", async () => {
      const TemplateVoucher = await new LazyMinting({
        _contract: NFT,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        signers[1].address,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await expect(
        NFT.redeem(voucherNFT, signers[2].address)
      ).to.be.revertedWith("IA");

      

      const TemplateVoucher2 = await new LazyMinting({
        _contract: NFT,
        _signer: signers[5],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        NFT.address,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await expect(
        NFT.redeem(voucherNFT2, signers[2].address)
      ).to.be.revertedWith("IS");

      const TemplateVoucher3 = await new LazyMinting({
        _contract: NFT,
        _signer: signers[1],
      });
      const voucherNFT3 = await TemplateVoucher3.createVoucher(
        NFT.address,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        ethers.constants.AddressZero,
        expandTo6Decimals(0)
      );
      await NFT.connect(signers[1]).redeem(voucherNFT3, signers[2].address);
      expect(await NFT.exists(1)).to.be.eq(true);

      const TemplateVoucher4 = await new LazyMinting({
        _contract: NFT,
        _signer: signers[1],
      });
      const voucherNFT4 = await TemplateVoucher4.createVoucher(
        NFT.address,
        5,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await expect(
        NFT.redeem(voucherNFT4, signers[2].address)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
    });

//new
    it("ERROR :max limit for NFT exceeded", async () => {
    const TemplateVoucher = await new LazyMinting({
      _contract: NFT,
      _signer: signers[1],
    });
  
  const voucherNFT1 = await TemplateVoucher.createVoucher(
      NFT.address,
      1,
      expandTo6Decimals(10),
      "TestURI",
      true,
      signers[2].address,
      expandTo6Decimals(0)
    );
    await(
      NFT.connect(signers[1]).redeem(voucherNFT1, signers[2].address)
    );

    const voucherNFT2 = await TemplateVoucher.createVoucher(
      NFT.address,
      2,
      expandTo6Decimals(10),
      "TestURI",
      true,
      signers[2].address,
      expandTo6Decimals(0)
    );
    await(
      NFT.connect(signers[1]).redeem(voucherNFT2, signers[2].address)
    );

    const voucherNFT3 = await TemplateVoucher.createVoucher(
      NFT.address,
      3,
      expandTo6Decimals(10),
      "TestURI",
      true,
      signers[2].address,
      expandTo6Decimals(0)
    );
    await(
      NFT.connect(signers[1]).redeem(voucherNFT3, signers[2].address)
    );

    const voucherNFT4 = await TemplateVoucher.createVoucher(
      NFT.address,
      4,
      expandTo6Decimals(10),
      "TestURI",
      true,
      signers[2].address,
      expandTo6Decimals(0)
    );
   

    
    await expect(
      NFT.connect(signers[1]).redeem(voucherNFT4, signers[2].address)).to.be.revertedWith("Template721: max limit exceed");

    

  

  });


    it("setting admin", async () => {
      await NFT.connect(signers[1]).setAdmin(signers[4].address);
      expect(await NFT.admin()).to.be.eq(signers[4].address);
      await expect(
        NFT.connect(signers[1]).setAdmin(signers[4].address)
      ).to.be.revertedWith("NA");
      await expect(
        NFT.connect(signers[4]).setAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZA");
    });

    it("setting creator", async () => {
      await NFT.connect(signers[1]).setCreator(signers[4].address);
      expect(await NFT.creator()).to.be.eq(signers[4].address);
      await expect(
        NFT.connect(signers[4]).setCreator(signers[5].address)
      ).to.be.revertedWith("NA");
      await expect(
        NFT.connect(signers[1]).setCreator(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZA");
    });
  });

  describe("Factory Test cases", async () => {
    it("updating address of template 721", async () => {
      await factory.connect(owner).updateTemplate721(signers[4].address);
      let address = await factory.template721Address();
      expect(address).to.be.eq(signers[4].address);
      await expect(
        factory.connect(signers[4]).updateTemplate721(signers[4].address)
      ).to.be.revertedWith("TokenFactory: Caller not admin");
      await expect(
        factory.connect(owner).updateTemplate721(ethers.constants.AddressZero)
      ).to.be.revertedWith("Zero address sent");
    });

    it("updating address of template 1155", async () => {
      await factory.connect(owner).updateTemplate1155(signers[4].address);

      expect(await factory.template1155Address()).to.be.eq(signers[4].address);

      await expect(
        factory.connect(signers[4]).updateTemplate1155(signers[4].address)
      ).to.be.revertedWith("TokenFactory: Caller not admin");
      await expect(
        factory.connect(owner).updateTemplate1155(ethers.constants.AddressZero)
      ).to.be.revertedWith("Zero address sent");
    });

    it("Updating market place address", async () => {
      await factory.connect(owner).updateMarketplace(signers[4].address);
      expect(await factory.marketplace()).to.be.eq(signers[4].address);

      await expect(
        factory.connect(signers[4]).updateMarketplace(signers[4].address)
      ).to.be.revertedWith("TokenFactory: Caller not admin");
      await expect(
        factory.connect(owner).updateMarketplace(ethers.constants.AddressZero)
      ).to.be.revertedWith("Zero address sent");
    });

    it("Updating admin address", async () => {
      await factory.updateAdmin(signers[4].address);
      expect(await factory.admin()).to.be.eq(signers[4].address);
      await expect(
        factory.connect(signers[5]).updateAdmin(signers[4].address)
      ).to.be.revertedWith("TokenFactory: Caller not admin");
      await expect(
        factory.connect(owner).updateAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith("Zero address sent");
    });

    it("Updating operator", async () => {
      await factory.connect(owner).updateOperator(signers[4].address, true);
      expect(await factory.operators(signers[4].address)).to.be.eq(true);
      await expect(
        factory.connect(signers[5]).updateOperator(signers[4].address, true)
      ).to.be.revertedWith("not admin");
      await expect(
        factory
          .connect(owner)
          .updateOperator(ethers.constants.AddressZero, true)
      ).to.be.revertedWith("Zero address sent");
    });

    it("Non-operator calls template721 create function", async () => {
      await expect(
        factory
          .connect(signers[4])
          .create721Token(
            "testName",
            "testSymbol",
            signers[1].address,
            signers[1].address,
            3
          )
      ).to.be.revertedWith("not operator");
    });

    it("Non-operator calls template1155 create function", async () => {
      await expect(
        factory
          .connect(signers[4])
          .create1155Token("TestUri", signers[1].address, signers[1].address)
      ).to.be.revertedWith("not operator");
    });
  });

  describe("Template 1155 test cases", async () => {
    it("Withdrawing stuck token, 1155", async () => {
      let balancebefore = await usdt.balanceOf(owner.address);
      await usdt
        .connect(owner)
        .transfer(singleMarketplace.address, expandTo6Decimals(1000));
      await template1155.connect(owner).withdrawStuckToken(usdt.address, false);
    });

    it("Withdrawing stuck token, factory", async () => {
      let balancebefore = await usdt.balanceOf(owner.address);
      await usdt
        .connect(owner)
        .transfer(singleMarketplace.address, expandTo6Decimals(1000));
      await factory.connect(owner).withdrawStuckToken(usdt.address, false);
    });
    it("Set Admin", async () => {
      await template1155.connect(signers[1]).setAdmin(signers[4].address);
      expect(await template1155.admin()).to.be.eq(signers[4].address);
    });
    it("Non admin calls setAdmin", async () => {
      await expect(
        template1155.connect(signers[2]).setAdmin(signers[4].address)
      ).to.be.revertedWith("NA");
    });
    it("Admin set as Zero address", async () => {
      await expect(
        template1155.connect(signers[1]).setAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZA");
    });

    it("Set Creator", async () => {
      await template1155.connect(signers[1]).setCreator(signers[5].address);
      expect(await template1155.creator()).to.be.eq(signers[5].address);
    });
    it("Non admin calls setCreator", async () => {
      await expect(
        template1155.connect(signers[2]).setCreator(signers[4].address)
      ).to.be.revertedWith("NA");
    });
    it("Creator set as Zero address", async () => {
      await expect(
        template1155
          .connect(signers[1])
          .setCreator(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZA");
    });
    it("Voucher already used", async () => {
      const Template1155Voucher3 = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[1],
      });
      const voucher3 = await Template1155Voucher3.createVoucher(
        template1155.address,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await template1155
        .connect(signers[1])
        .redeem(voucher3, signers[2].address, 1);
      await expect(
        template1155.connect(signers[1]).redeem(voucher3, signers[3].address, 1)
      ).to.be.revertedWith("VU");
    });
    it("Invalid NFT address", async () => {
      const Template1155Voucher = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        signers[1].address,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await expect(
        template1155.redeem(voucher, signers[2].address, expandTo6Decimals(5))
      ).to.be.revertedWith("IA");
    });

    it("Invalid NFT voucher signer", async () => {
      const Template1155Voucher2 = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[5],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        template1155.address,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await expect(
        template1155
          .connect(signers[1])
          .redeem(voucher2, signers[2].address, expandTo6Decimals(5))
      ).to.be.revertedWith("IS");
    });

    it("non token owner caller for redeem", async () => {
      const Template1155Voucher3 = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[1],
      });
      const voucher3 = await Template1155Voucher3.createVoucher(
        template1155.address,
        1,
        expandTo6Decimals(10),
        1,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      await expect(
        template1155.connect(signers[2]).redeem(voucher3, signers[2].address, 1)
      ).to.be.revertedWith("ERC1155:caller is not token owner nor approved");
    });

    it("Redeem 1155 with different amounts ", async () => {
      const Template1155Voucher3 = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[1],
      });
      const voucher3 = await Template1155Voucher3.createVoucher(
        template1155.address,
        1,
        expandTo6Decimals(10),
        3,
        1,
        "TestURI",
        true,
        ethers.constants.AddressZero,
        expandTo6Decimals(0)
      );
      await template1155
        .connect(signers[1])
        .redeem(voucher3, signers[2].address, 2);
      await template1155
        .connect(signers[1])
        .redeem(voucher3, signers[3].address, 1);
    });
    it("safeBatchTransferFrom ", async () => {
      const Template1155Voucher = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        template1155.address,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        ethers.constants.AddressZero,
        expandTo6Decimals(0)
      );
      const voucher2 = await Template1155Voucher.createVoucher(
        template1155.address,
        2,
        expandTo6Decimals(10),
        3,
        1,
        "TestURI",
        true,
        ethers.constants.AddressZero,
        expandTo6Decimals(0)
      );
      await template1155
        .connect(signers[1])
        .redeem(voucher, signers[2].address, 1);
      await template1155
        .connect(signers[1])
        .redeem(voucher2, signers[2].address, 1);
      await template1155
        .connect(signers[2])
        .safeBatchTransferFrom(
          signers[2].address,
          signers[3].address,
          [1, 2],
          [1, 1],
          []
        );
    });

    it("safeBatchTransferFrom:non token owner caller", async () => {
      const Template1155Voucher = await new template1155Voucher({
        _contract: template1155,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        template1155.address,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        ethers.constants.AddressZero,
        expandTo6Decimals(0)
      );
      const voucher2 = await Template1155Voucher.createVoucher(
        template1155.address,
        2,
        expandTo6Decimals(10),
        3,
        1,
        "TestURI",
        true,
        ethers.constants.AddressZero,
        expandTo6Decimals(0)
      );
      await template1155
        .connect(signers[1])
        .redeem(voucher, signers[2].address, 1);
      await template1155
        .connect(signers[1])
        .redeem(voucher2, signers[2].address, 1);
      await expect(
        template1155
          .connect(signers[3])
          .safeBatchTransferFrom(
            signers[2].address,
            signers[3].address,
            [1, 2],
            [1, 1],
            []
          )
      ).to.be.revertedWith("ERC1155: not approved");
    });
  });

  describe("SingleMarketplace: 1155 NFT ", async () => {

    it("custodial to custodial buy", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);

      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);

      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });

      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });

      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );

      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy

      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucherNFT2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );

      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      );
      expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
    });

    

    it("custodial to custodial buy: royalty keeper", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);

      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);

      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });

      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        signers[4].address,
        expandTo6Decimals(0)
      );
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[4].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });

      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );

      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy

      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucherNFT2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[4].address,
        expandTo6Decimals(0)
      );

      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[4].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );

      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      );
      expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
    });

//new
    it("custodial to custodial buy: balance check", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);

      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);

      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = await new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });

      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        2,
        1,
        "TestURI",
        true,
        signers[4].address,
        expandTo6Decimals(0)
      );
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[4].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });

      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );

      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);

      // transfer 1155
        await TRS.connect(signers[6]).safeTransferFrom(signers[6].address, signers[1].address, 1, 2, "0xee");

      //Secondary Buy

      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const TemplateVoucherNFT2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucherNFT2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        false,
        signers[4].address,
        expandTo6Decimals(0)
      );

      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[4].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );

      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );

      await expect(singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      )).to.be.revertedWith("NO");
    });

    it("ERROR custodial to custodial primary buy:invalid buyer", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[5].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR custodial to custodial primary buy : buyer and nft mismatched addresses", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        signers[8].address,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("AI");
    });

    it("ERROR custodial to custodial secondary buy :invalid Seller", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IS");
    });

    it("custodial to custodial secondary buy errror: invalid buyer", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[3].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IB");
    });
    it("custodial to custodial secondary buy : mismatched addresses", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        signers[8].address,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("AI");
    });

    it("custodial to custodial primary buy: counters mismatched", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("CI");
    });

    it("custodial to custodial primary buy: mismatched amounts", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        1,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        1,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          true
        )
      ).to.be.revertedWith("AMI");
    });


    it("custodial to custodial primary buy :price doesn't match", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(9),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("PI");
    });

    it("custodial to noncustodial buy", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, signers[1].address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        3,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //  Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      );
      expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
    });


    it("custodial to noncustodial buy, check counter", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, signers[1].address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        5,
        3,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        5,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );

      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[8],
      });

      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[8].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[8].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[8])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );

      const buyerVoucher3 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[9],
      });

      const Voucherbuy3 = await buyerVoucher3.createVoucher1155(
        Tseries,
        signers[9].address,
        1,
        1,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[9].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[9])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy3,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
 });

//new
    it("ERROR: custodial to noncustodial buy , counter used", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, signers[1].address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //  Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );

      const buyerVoucher3 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy3 = await buyerVoucher3.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy3,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      );
      await expect(singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      )).to.be.revertedWith("CU");
    });

   

    it("ERROR: custodial to noncustodial primary buy: invalid buyer", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );

      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[5].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR custodial to noncustodial primary buy:  mismatched addresses", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        signers[2].address,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("");
    });

    it("ERROR custodial to noncustodial primary buy: invalid price", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(4),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(3),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(3),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("PI");
    });

    it("ERROR custodial to noncustodial secondary buy: invalid Seller", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR custodial to noncustodial secondary buy: invalid buyer", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        true
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy
      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        true
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[3].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IB");
    });

    it("non custodial to custodial buy", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      );
      expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
    });

    it("ERROR non custodial to custodial primary buy: invalid buyer", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("IB");
    });

    it("non custodial to custodial primary buy: mismatched addresses", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        signers[2].address,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("");
    });

    it("non custodial to custodial primary buy: invalid price", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(11),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("PI");
    });

    it("ERROR non custodial to custodial secondary buy: invalid Seller", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[4].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR non custodial to custodial secondary buy: invalid buyer", async () => {
      //create collection
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        true
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(owner)
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[2].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[2].address),
        true
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IB");
    });

    it("non custodial to non custodial buy", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await singleMarketplace.Buy(
        Voucherbuy2,
        VoucherSell2,
        voucher2,
        voucherNFT2,
        false
      );
      expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
    });

//new
    it("non custodial to non custodial buy, wrong nonce", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);

      await usdt
        .connect(owner)
        .transfer(signers[8].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[8])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      )).to.be.revertedWith("WN");
     
    });



    it("non custodial to non custodial buy : mismatched addresses", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);

      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);

      const TRS = await new Template1155__factory(owner).attach(Tseries);

      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });

      const voucher = await Template1155Voucher.createVoucher(
        signers[4].address,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );

      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });

      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );

      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });

      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));

      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));

      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("");
    });

    it("ERROR non custodial to non custodial primary buy: invalid price", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(11),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("PI");
    });

    it("ERROR non custodial to non custodial primary buy:invalid buyer", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[2].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect(
        singleMarketplace.Buy(
          Voucherbuy,
          VoucherSell,
          voucher,
          voucherNFT,
          false
        )
      ).to.be.revertedWith("IB");
    });

    it("ERROR: non custodial to non custodial secondary buy: invalid Seller", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[7].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[7].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IS");
    });

    it("ERROR non custodial to non custodial  secondary buy: invalid buyer", async () => {
      await factory
        .connect(owner)
        .create1155Token("T-series", owner.address, superOwner.address);
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({
        _contract: TRS,
        _signer: owner,
      });
      const voucher = await Template1155Voucher.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        1,
        "testURI",
        true,
        signers[2].address,
        1
      );
      const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT = await TemplateVoucher.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: owner,
      });
      const VoucherSell = await sellerVoucher.createVoucher1155(
        Tseries,
        owner.address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        true,
        false
      );
      const buyerVoucher = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const Voucherbuy = await buyerVoucher.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        1,
        await web3Object.eth.getTransactionCount(signers[6].address),
        false
      );
      //Primary Buy

      await usdt
        .connect(owner)
        .transfer(signers[6].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[6])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await singleMarketplace.Buy(
        Voucherbuy,
        VoucherSell,
        voucher,
        voucherNFT,
        false
      );
      expect(await TRS.balanceOf(signers[6].address, 1)).to.be.eq(2);
      //Secondary Buy
      const Template1155Voucher2 = new template1155Voucher({
        _contract: TRS,
        _signer: signers[6],
      });
      const voucher2 = await Template1155Voucher2.createVoucher(
        addressOfTemplate,
        1,
        expandTo6Decimals(3),
        2,
        2,
        "testURI",
        false,
        signers[2].address,
        1
      );
      const TemplateVoucher2 = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });
      const voucherNFT2 = await TemplateVoucher2.createVoucher(
        Tseries,
        1,
        expandTo6Decimals(10),
        "TestURI",
        true,
        signers[2].address,
        expandTo6Decimals(0)
      );
      const sellerVoucher2 = new SellerVoucher({
        _contract: singleMarketplace,
        _signer: signers[6],
      });
      const VoucherSell2 = await sellerVoucher2.createVoucher1155(
        Tseries,
        signers[6].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        true,
        false
      );
      const buyerVoucher2 = new BuyerVoucher({
        _contract: singleMarketplace,
        _signer: signers[7],
      });
      const Voucherbuy2 = await buyerVoucher2.createVoucher1155(
        Tseries,
        signers[3].address,
        1,
        2,
        expandTo6Decimals(10),
        2,
        await web3Object.eth.getTransactionCount(signers[3].address),
        false
      );
      await usdt
        .connect(owner)
        .transfer(signers[7].address, expandTo6Decimals(1000));
      await usdt
        .connect(signers[7])
        .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await TRS.connect(signers[6]).setApprovalForAll(
        singleMarketplace.address,
        true
      );
      await expect(
        singleMarketplace.Buy(
          Voucherbuy2,
          VoucherSell2,
          voucher2,
          voucherNFT2,
          false
        )
      ).to.be.revertedWith("IB");
    });

    describe("setter functions", async () => {
      it("updating token address", async () => {
        await singleMarketplace.setToken(signers[4].address);
        expect(await singleMarketplace.token()).to.be.eq(signers[4].address);
      });

      it("updating market wallet address", async () => {
        await singleMarketplace.setWallet(signers[4].address,true);
        expect(await singleMarketplace.marketWallet()).to.be.eq(
          signers[4].address
        );
      });

      it("Updating treasury wallet address", async () => {
        await singleMarketplace.setWallet(signers[4].address, false);
        expect(await singleMarketplace.treasury()).to.be.eq(signers[4].address);
      });

      it("Updating market fee amount", async () => {
        await singleMarketplace.setMarketFee(2);
        expect(await singleMarketplace.marketFee()).to.be.eq(2);
      });

      it("transferring admin", async () => {
        await singleMarketplace.transferAdminRole(signers[4].address);
        expect(await singleMarketplace.admin()).to.be.eq(signers[4].address);
      });

      it("Non-operator calls template1155 create function", async () => {
        await expect(
          factory
            .connect(signers[4])
            .create1155Token("TestUri", signers[1].address, signers[1].address)
        ).to.be.revertedWith("not operator");
      });
    });
  });
});
