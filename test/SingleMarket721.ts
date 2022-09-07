import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
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
  SingleMarket__factory
} from "../typechain";
import LazyMinting from "./utilities/LazyMinting";
import SellerVoucher from "./utilities/SellerVoucher";
import BuyerVoucher from "./utilities/BuyerVoucher";

import { expandTo18Decimals, expandTo6Decimals } from "./utilities/utilities";
import { expect } from "chai";
// import { console } from "console";
import template1155Voucher from "./utilities/SFTVoucher";

describe("Template", async () => {
  let NFT: Template721;
  let factory: TokenFactory;
  let owner: SignerWithAddress;
  let superOwner: SignerWithAddress;
  let signers: SignerWithAddress[];
  let usdt: Usd;

  

  // let Marketplace: HeftyVerseMarketplace721;

  let template1155: Template1155;
  // let marketplace1155 : HeftyVerseMarketplace1155;
  let singleMarketplace: SingleMarket;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];
    superOwner = signers[1];
    NFT = await new Template721__factory(owner).deploy();
    template1155 = await new Template1155__factory(owner).deploy();
    usdt = await new Usd__factory(owner).deploy();
    factory = await new TokenFactory__factory(owner).deploy();
    
    // Marketplace = await new HeftyVerseMarketplace721__factory(owner).deploy();

    // await Marketplace.initialise(
    //   owner.address,
    //   owner.address,
    //   usdt.address,
    //   owner.address
    //   );

    // Marketplace = await new HeftyVerseMarketplace721__factory(owner).deploy(owner.address,owner.address,usdt.address,owner.address);

    // marketplace1155 = await new HeftyVerseMarketplace1155__factory(owner).deploy(owner.address,owner.address,usdt.address,owner.address);
    singleMarketplace = await new SingleMarket__factory(owner).deploy();

    await singleMarketplace.initialize(
      owner.address,
      owner.address,
      usdt.address,
      owner.address
      );

    await NFT.initialize(
      "testName",
      "testSymbol",
      owner.address,
      superOwner.address,
      factory.address
    );
    await template1155.initialize(
      "testURI",
      owner.address,
      signers[1].address,
      factory.address
    );
    await factory.connect(owner).initialize(
      NFT.address,
      template1155.address,
      singleMarketplace.address
    );
    
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
          signers[1].address
          
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
          signers[1].address
          
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

    it("non-custodial to custodial", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address
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
          signers[1].address
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
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address
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
          superOwner.address
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
          superOwner.address
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
          superOwner.address
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
          superOwner.address
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
          signers[1].address
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
          signers[1].address
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
          superOwner.address
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
          signers[1].address
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
          signers[1].address
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
          superOwner.address
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
          signers[1].address
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

      await singleMarketplace.Buy(buyerVoucher, sellerVoucher, voucher,voucherNFT, true);
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT2 = await TemplateVoucher2.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher2= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher2 = await Template1155Voucher2.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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
        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(buyerVoucher2, sellerVoucher2, voucher2,voucherNFT2, true)
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
          signers[1].address
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT = await TemplateVoucher.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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

      await singleMarketplace.Buy(buyerVoucher, sellerVoucher, voucher,voucherNFT, true);
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT2 = await TemplateVoucher2.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher2= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher2 = await Template1155Voucher2.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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
        1,        true
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(buyerVoucher2, sellerVoucher2, voucher2,voucherNFT2, true)
      ).to.be.revertedWith("IB");
    });

    // //non-custodial to non-custodial

    it("ERROR: Signature of buyer not matching at primary buy(N2N)", async () => {
      //create collection
      await factory
        .connect(owner)
        .create721Token(
          "T-series",
          "TSR",
          owner.address,
          superOwner.address
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const TemplateVoucher= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT = await TemplateVoucher.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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
        singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT, true)
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
          signers[1].address
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT = await TemplateVoucher.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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

      await singleMarketplace.Buy(buyerVoucher, sellerVoucher, voucher,voucherNFT, true);
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT2 = await TemplateVoucher2.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher2= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher2 = await Template1155Voucher2.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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
        false
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(buyerVoucher2, sellerVoucher2, voucher2,voucherNFT2, true)
      ).to.be.revertedWith("IS");
    });

    it("ERROR: Signature of buyer not matching at secondary buy(N2N)", async () => {
      await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address
        );
      const Tseries = await factory
        .connect(owner)
        .userNFTContracts(owner.address, 0);
      const TRS = await new Template721__factory(owner).attach(Tseries);

      //creating vouchers
      const TemplateVoucher= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT = await TemplateVoucher.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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

      await singleMarketplace.Buy(buyerVoucher, sellerVoucher, voucher,voucherNFT, true);
      expect(await TRS.balanceOf(signers[6].address)).to.be.eq(1);

      //Secondary buy
      const TemplateVoucher2= await new LazyMinting({_contract:TRS, _signer:signers[1]});
      const voucherNFT2 = await TemplateVoucher2.createVoucher(Tseries,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      const Template1155Voucher2= await new template1155Voucher({_contract:TRS, _signer:signers[1]});
      const voucher2 = await Template1155Voucher2.createVoucher(Tseries,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));

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
        false
      );

      await TRS.connect(signers[6]).approve(singleMarketplace.address, 1);

      await expect(
        singleMarketplace.Buy(buyerVoucher2, sellerVoucher2, voucher2,voucherNFT2, true)
      ).to.be.revertedWith("IB");
    });

    //setter function test cases

    it("updating token address", async () => {
      await singleMarketplace.setToken(signers[4].address);
      expect(await singleMarketplace.token()).to.be.eq(signers[4].address);
      await expect(singleMarketplace.connect(signers[5]).setToken(signers[4].address)).to.be.revertedWith("NA")
      await expect(singleMarketplace.connect(owner).setToken(ethers.constants.AddressZero)).to.be.revertedWith("ZA")
    });

    it("updating market wallet address", async () => {
      await singleMarketplace.setMarketingWallet(signers[4].address);
      expect(await singleMarketplace.marketWallet()).to.be.eq(
        signers[4].address
      );

      await expect(singleMarketplace.connect(signers[5]).setMarketingWallet(signers[4].address)).to.be.revertedWith("NA");
      await expect(singleMarketplace.connect(owner).setMarketingWallet(ethers.constants.AddressZero)).to.be.revertedWith("ZA");
    });

    it("Updating treasury wallet address", async () => {
      await singleMarketplace.settreasury(signers[4].address);
      expect(await singleMarketplace.treasury()).to.be.eq(signers[4].address);

      await expect(singleMarketplace.connect(signers[5]).settreasury(signers[4].address)).to.be.revertedWith("NA");
      await expect(singleMarketplace.connect(owner).settreasury(ethers.constants.AddressZero)).to.be.revertedWith("ZA");      

    });

    it("Updating market fee amount", async () => {
      await singleMarketplace.setMarketFee(2);
      expect(await singleMarketplace.marketFee()).to.be.eq(2);
      await expect(singleMarketplace.connect(signers[4]).setMarketFee(10000)).to.be.revertedWith("NA");
      await expect(singleMarketplace.connect(owner).setMarketFee(100000)).to.be.revertedWith("IV");
    });

   
      it("transferring admin", async () => {
        await singleMarketplace.connect(owner).transferAdminRole(signers[4].address);
        expect(await singleMarketplace.admin()).to.be.eq(signers[4].address);
        await expect(singleMarketplace.connect(signers[5]).transferAdminRole(signers[4].address)).to.be.revertedWith("NA");
        await expect(singleMarketplace.connect(signers[4]).transferAdminRole(ethers.constants.AddressZero)).to.be.revertedWith("ZA");
      });

      it("Reset Counter",async()=>{
        await factory
        .connect(owner)
        .create721Token(
          "TestName",
          "TestSymbol",
          owner.address,
          signers[1].address
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
        await expect(singleMarketplace.connect(signers[4]).resetCounter(sellerVoucher)).to.be.revertedWith("NA");
      });

      it("Withdrawing stuck token",async()=>{
        let balancebefore = await usdt.balanceOf(owner.address);
        await usdt.connect(owner).transfer(singleMarketplace.address,expandTo6Decimals(1000));
        await singleMarketplace.connect(owner).withdrawStuckToken(usdt.address);
        expect(await usdt.balanceOf(owner.address)).to.be.eq(balancebefore);
        

      });
    });

    describe("Template 721 test cases", async () => {
      it("Redeem functionality", async () => {
      const TemplateVoucher= await new LazyMinting({_contract:NFT, _signer:signers[1]});
      const voucherNFT = await TemplateVoucher.createVoucher(signers[1].address,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      await expect(NFT.redeem(voucherNFT,signers[2].address)).to.be.revertedWith("IA");

      const TemplateVoucher2= await new LazyMinting({_contract:NFT, _signer:signers[5]});
      const voucherNFT2 = await TemplateVoucher2.createVoucher(NFT.address,1,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      await expect(NFT.redeem(voucherNFT2,signers[2].address)).to.be.revertedWith("IS");

      const TemplateVoucher3= await new LazyMinting({_contract:NFT, _signer:signers[1]});
      const voucherNFT3 = await TemplateVoucher3.createVoucher(NFT.address,1,expandTo6Decimals(10),"TestURI",true,ethers.constants.AddressZero,expandTo6Decimals(0));
      await NFT.connect(signers[1]).redeem(voucherNFT3,signers[2].address);
      expect(await NFT.exists(1)).to.be.eq(true);

      const TemplateVoucher4= await new LazyMinting({_contract:NFT, _signer:signers[1]});
      const voucherNFT4 = await TemplateVoucher4.createVoucher(NFT.address,5,expandTo6Decimals(10),"TestURI",true,signers[2].address,expandTo6Decimals(0));
      await expect(NFT.redeem(voucherNFT4,signers[2].address)).to.be.revertedWith("ERC721: caller is not token owner nor approved");
     
      });

      
      

      it("setting admin", async () => {
        await NFT.connect(signers[1]).setAdmin(signers[4].address);
        expect(await NFT.admin()).to.be.eq(signers[4].address);
        await expect(NFT.connect(signers[1]).setAdmin(signers[4].address)).to.be.revertedWith("NA");
        await expect(NFT.connect(signers[4]).setAdmin(ethers.constants.AddressZero)).to.be.revertedWith("ZA");
      });

      it("setting creator", async () => {
        await NFT.connect(signers[1]).setCreator(signers[4].address);
        expect(await NFT.creator()).to.be.eq(signers[4].address);
        await expect(NFT.connect(signers[4]).setCreator(signers[5].address)).to.be.revertedWith("NA");
        await expect(NFT.connect(signers[1]).setCreator(ethers.constants.AddressZero)).to.be.revertedWith("ZA");
      });

      // it("setting token", async () => {
      //   await NFT.setToken(signers[4].address);
      //   expect(await NFT.token()).to.be.eq(signers[4].address);
      // });
    });

    describe("Factory Test cases", async () => {
      it("updating address of template 721", async () => {
        await factory.connect(owner).updateTemplate721(signers[4].address);
        let address = await factory.template721Address();
        expect(address).to.be.eq(signers[4].address);
        await expect( factory.connect(signers[4]).updateTemplate721(signers[4].address)).to.be.revertedWith("TokenFactory: Caller not admin");
        await expect( factory.connect(owner).updateTemplate721(ethers.constants.AddressZero)).to.be.revertedWith("Zero address sent");
      });

      it("updating address of template 1155", async () => {
        await factory.connect(owner).updateTemplate1155(signers[4].address);

        expect(await factory.template1155Address()).to.be.eq(
          signers[4].address
        );

        await expect( factory.connect(signers[4]).updateTemplate1155(signers[4].address)).to.be.revertedWith("TokenFactory: Caller not admin");
        await expect( factory.connect(owner).updateTemplate1155(ethers.constants.AddressZero)).to.be.revertedWith("Zero address sent");
      });

      it("Updating market place address", async () => {
        await factory.connect(owner).updateMarketplace(signers[4].address);
        expect(await factory.marketplace()).to.be.eq(signers[4].address);

        await expect( factory.connect(signers[4]).updateMarketplace(signers[4].address)).to.be.revertedWith("TokenFactory: Caller not admin");
        await expect( factory.connect(owner).updateMarketplace(ethers.constants.AddressZero)).to.be.revertedWith("Zero address sent");
      });

      it("Updating admin address", async () => {
        await factory.updateAdmin(signers[4].address);
        expect(await factory.admin()).to.be.eq(signers[4].address);
        await expect( factory.connect(signers[5]).updateAdmin(signers[4].address)).to.be.revertedWith("TokenFactory: Caller not admin");
        await expect( factory.connect(owner).updateAdmin(ethers.constants.AddressZero)).to.be.revertedWith("Zero address sent");
      });

      it("Updating operator",async()=>{
        await factory.connect(owner).updateOperator(signers[4].address,true);
        expect(await factory.operators(signers[4].address)).to.be.eq(true);
        await expect(factory.connect(signers[5]).updateOperator(signers[4].address,true)).to.be.revertedWith("not admin");
        await expect(factory.connect(owner).updateOperator(ethers.constants.AddressZero,true)).to.be.revertedWith("Zero address sent")

      })

      it("Non-operator calls template721 create function",async()=>{
       await expect(factory.connect(signers[4]).create721Token("testName","testSymbol",signers[1].address,signers[1].address)).to.be.revertedWith("not operator")
      });

      it("Non-operator calls template1155 create function",async()=>{
        await expect(factory.connect(signers[4]).create1155Token("TestUri",signers[1].address,signers[1].address)).to.be.revertedWith("not operator")
       });
    });

  });

