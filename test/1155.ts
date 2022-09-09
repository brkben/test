import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, } from "hardhat";
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
  SingleMarket__factory} from "../typechain"
import SellerVoucher from "./utilities/SellerVoucher";
import BuyerVoucher from "./utilities/BuyerVoucher";
import { expandTo6Decimals } from "./utilities/utilities";
import { expect } from "chai";
// import { console } from "console";
import template1155Voucher from "./utilities/SFTVoucher";
import LazyMinting from "./utilities/LazyMinting";


describe("Template", async() => {
let NFT : Template721;
let factory : TokenFactory;
let owner : SignerWithAddress;
let superOwner : SignerWithAddress;
let signers : SignerWithAddress[];
let usdt :Usd;
let template1155 : Template1155;
let singleMarketplace:SingleMarket;

beforeEach(async() =>{
    signers= await ethers.getSigners();
    owner = signers[0];
    superOwner = signers[1];
    NFT = await new Template721__factory(owner).deploy();
    template1155 = await new Template1155__factory(owner).deploy();
    usdt = await new Usd__factory(owner).deploy();
    factory = await new TokenFactory__factory(owner).deploy();
    singleMarketplace= await new SingleMarket__factory(owner).deploy();
    await NFT.initialize("testName","testSymbol", owner.address, superOwner.address,signers[2].address);
    await template1155.initialize("testURI",owner.address,signers[1].address,factory.address);
    await factory.initialize(NFT.address, template1155.address,singleMarketplace.address);
    await usdt.mint(signers[1].address, expandTo6Decimals(100));
    await singleMarketplace.initialize(
      owner.address,
      owner.address,
      usdt.address,
      owner.address
      );
});


describe("singleMarketplace 1155 ",async()=>{

  // it("factory", async() =>{
  //   await factory.connect(signers[0]).create721Token("testName","testSymbol",owner.address,superOwner.address,)
  //   await factory.connect(signers[1]).create721Token("heftiverse","hef",owner.address,superOwner.address,);
  //   await factory.connect(signers[2]).create721Token("hefty","hev",owner.address,superOwner.address,);
  //   });
  // });
 
  
it("custodial to custodial buy", async () => {
  //create collection
  await factory
    .connect(owner)
    .create1155Token(
      "T-series",
      owner.address,
      superOwner.address,
      
    );

  const Tseries = await factory
    .connect(owner)
    .userNFTContracts(owner.address,0);

    const TRS = await new Template1155__factory(owner).attach(Tseries);
  //creating vouchers
  const Template1155Voucher = await new template1155Voucher({
    _contract: TRS,
    _signer: owner
  });
  const TemplateVoucher = await new LazyMinting({
      _contract: TRS,
      _signer: signers[1],
    });

  const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(10),2,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));
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
    _signer: owner
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
    _signer: signers[6]
  });
  const Voucherbuy = await buyerVoucher.createVoucher1155(
    Tseries,
    signers[6].address,
    1,
    2,
    expandTo6Decimals(10),
    1,
    true
  );
  //Primary Buy

  await usdt
    .connect(owner)
    .transfer(signers[6].address, expandTo6Decimals(1000));

  await usdt
    .connect(owner)
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await singleMarketplace.Buy(Voucherbuy,VoucherSell,voucher,voucherNFT,false);

    expect(await TRS.balanceOf(signers[6].address,1)).to.be.eq(2);
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

  const voucher2= await Template1155Voucher2.createVoucher(Tseries,1,expandTo6Decimals(3),2,2,"testURI",false,signers[2].address,expandTo6Decimals(0)); 
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
    true
  );
  await usdt
    .connect(owner)
    .transfer(signers[7].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[7])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
  await singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false);
 expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
});


  it("custodial to custodial buy: royalty keeper", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );

    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);

      const TRS = await new Template1155__factory(owner).attach(Tseries);
    //creating vouchers
    const Template1155Voucher = await new template1155Voucher({
      _contract: TRS,
      _signer: owner
    });
    const TemplateVoucher = await new LazyMinting({
        _contract: TRS,
        _signer: signers[1],
      });

    const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(10),2,1,"TestURI",true,signers[4].address,expandTo6Decimals(0));
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
      _signer: owner
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
      _signer: signers[6]
    });
    const Voucherbuy = await buyerVoucher.createVoucher1155(
      Tseries,
      signers[6].address,
      1,
      2,
      expandTo6Decimals(10),
      1,
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));

    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy,VoucherSell,voucher,voucherNFT,false);

      expect(await TRS.balanceOf(signers[6].address,1)).to.be.eq(2);
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
  
    const voucher2= await Template1155Voucher2.createVoucher(Tseries,1,expandTo6Decimals(3),2,2,"testURI",false,signers[4].address,expandTo6Decimals(0)); 
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
      true
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
    await singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false);
    expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
  });

  it("ERROR custodial to custodial primary buy:invalid buyer", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
    const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(3),2,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));
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
      true
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("IB");
    });



  it("ERROR custodial to custodial primary buy : buyer and nft mismatched addresses", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
    const voucher = await Template1155Voucher.createVoucher(Tseries,1,expandTo6Decimals(3),2,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));
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
      true
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("AI");
    });

      it("ERROR custodial to custodial secondary buy :invalid Seller", async () => {
        //create collection
        await factory
          .connect(owner)
          .create1155Token(
            "T-series",
            owner.address,
            superOwner.address,
            
          );
        const Tseries = await factory
          .connect(owner)
          .userNFTContracts(owner.address,0);
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
          true
        );
        //Primary Buy
        await usdt
          .connect(owner)
          .transfer(signers[6].address, expandTo6Decimals(1000));
        await usdt
          .connect(owner)
          .approve(singleMarketplace.address, expandTo6Decimals(1000));
        await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
          true
        );
        await usdt
          .connect(owner)
          .transfer(signers[7].address, expandTo6Decimals(1000));
        await usdt
          .connect(signers[7])
          .approve(singleMarketplace.address, expandTo6Decimals(1000));
        await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
        await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IS");
      });

      it("custodial to custodial secondary buy errror: invalid buyer", async () => {
        //create collection
        await factory
          .connect(owner)
          .create1155Token(
            "T-series",
            owner.address,
            superOwner.address,
            
          );
        const Tseries = await factory
          .connect(owner)
          .userNFTContracts(owner.address,0);
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
          true
        );
        //Primary Buy
        await usdt
          .connect(owner)
          .transfer(signers[6].address, expandTo6Decimals(1000));
        await usdt
          .connect(owner)
          .approve(singleMarketplace.address, expandTo6Decimals(1000));
        await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
          true
        );
        await usdt
          .connect(owner)
          .transfer(signers[7].address, expandTo6Decimals(1000));
        await usdt
          .connect(signers[7])
          .approve(singleMarketplace.address, expandTo6Decimals(1000));
        await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
        await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IB");
      });

  it("custodial to noncustodial buy", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        signers[1].address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      false
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
    await singleMarketplace.Buy(Voucherbuy2,VoucherSell2,voucher2,voucherNFT2,false);
    expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
  });

  it("ERROR: custodial to noncustodial primary buy: invalid buyer", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
      await expect (singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("IB");
    });

  it("ERROR custodial to noncustodial primary buy:  mismatched addresses", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect (singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("");
  });

  it("ERROR custodial to noncustodial primary buy: invalid price", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("PI");
  });

  it("ERROR custodial to noncustodial secondary buy: invalid Seller", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      false
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
    await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IS");
  });

  it("ERROR custodial to noncustodial secondary buy: invalid buyer", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy
    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      false
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
    await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IB");
  });

  it("non custodial to custodial buy", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      true
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);  
    await singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false);
    expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
  });

  it("ERROR non custodial to custodial primary buy: invalid buyer", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("IB");
  });

  it("non custodial to custodial primary buy: mismatched addresses", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("");
  });

  it("non custodial to custodial primary buy: invalid price", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("PI");
  });

  it("ERROR non custodial to custodial secondary buy: invalid Seller", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      true
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);  
    await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IS");
  });

  it("ERROR non custodial to custodial secondary buy: invalid buyer", async () => {
    //create collection
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      true
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(owner)
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      true
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);  
    await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IB");
  });

  it("non custodial to non custodial buy", async () => {
    await factory
      .connect(owner)
      .create1155Token(
        "T-series",
        owner.address,
        superOwner.address,
        
      );
    const Tseries = await factory
      .connect(owner)
      .userNFTContracts(owner.address,0);
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
      false
    );
    //Primary Buy

    await usdt
      .connect(owner)
      .transfer(signers[6].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[6])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
      false
    );
    await usdt
      .connect(owner)
      .transfer(signers[7].address, expandTo6Decimals(1000));
    await usdt
      .connect(signers[7])
      .approve(singleMarketplace.address, expandTo6Decimals(1000));
    await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
    await singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT,false);
    expect(await TRS.balanceOf(signers[7].address, 1)).to.be.eq(2);
  
});

it("non custodial to non custodial buy : mismatched addresses", async () => {
  
  await factory
    .connect(owner)
    .create1155Token(
      "T-series",
      owner.address,
      superOwner.address,
      
    );
    
  const Tseries = await factory
    .connect(owner)
    .userNFTContracts(owner.address,0);
    
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
    false
  );
  //Primary Buy
  
  await usdt
    .connect(owner)
    .transfer(signers[6].address, expandTo6Decimals(1000));
    
  await usdt
    .connect(signers[6])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
    
  await expect( singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("");
});

it("ERROR non custodial to non custodial primary buy: invalid price", async () => {
  await factory
    .connect(owner)
    .create1155Token(
      "T-series",
      owner.address,
      superOwner.address,
      
    );
  const Tseries = await factory
    .connect(owner)
    .userNFTContracts(owner.address,0);
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
    false
  );
  //Primary Buy

  await usdt
    .connect(owner)
    .transfer(signers[6].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[6])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("PI");
});

it("ERROR non custodial to non custodial primary buy:invalid buyer", async () => {
  await factory
    .connect(owner)
    .create1155Token(
      "T-series",
      owner.address,
      superOwner.address,
      
    );
  const Tseries = await factory
    .connect(owner)
    .userNFTContracts(owner.address,0);
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
    false
  );
  //Primary Buy

  await usdt
    .connect(owner)
    .transfer(signers[6].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[6])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("IB");
});

it("ERROR: non custodial to non custodial secondary buy: invalid Seller", async () => {
  await factory
    .connect(owner)
    .create1155Token(
      "T-series",
      owner.address,
      superOwner.address,
      
    );
  const Tseries = await factory
    .connect(owner)
    .userNFTContracts(owner.address,0);
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
    false
  );
  //Primary Buy

  await usdt
    .connect(owner)
    .transfer(signers[6].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[6])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
    false
  );
  await usdt
    .connect(owner)
    .transfer(signers[7].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[7])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
  await expect(singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IS");
});

it("ERROR non custodial to non custodial buy: invalid buyer", async () => {
  await factory
    .connect(owner)
    .create1155Token(
      "T-series",
      owner.address,
      superOwner.address,
      
    );
  const Tseries = await factory
    .connect(owner)
    .userNFTContracts(owner.address,0);
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
    false
  );
  //Primary Buy

  await usdt
    .connect(owner)
    .transfer(signers[6].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[6])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false);
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
    false
  );
  await usdt
    .connect(owner)
    .transfer(signers[7].address, expandTo6Decimals(1000));
  await usdt
    .connect(signers[7])
    .approve(singleMarketplace.address, expandTo6Decimals(1000));
  await TRS.connect(signers[6]).setApprovalForAll(singleMarketplace.address,true);
  await expect (singleMarketplace.Buy(Voucherbuy2, VoucherSell2, voucher2,voucherNFT2,false)).to.be.revertedWith("IB");
});

  it("AI155 Buy: Addresses doesn't match",async()=>{
    //create collection
    await factory.connect(owner).create1155Token("T-series", owner.address, superOwner.address);
    const Tseries = await factory.connect(owner).userNFTContracts(owner.address,0);
    const TRS = await new Template1155__factory(owner).attach(Tseries);
    const addressOfTemplate = Tseries;
    //creating vouchers
    const Template1155Voucher = new template1155Voucher({_contract:TRS , _signer:owner});
    const voucher= await Template1155Voucher.createVoucher(addressOfTemplate,1,expandTo6Decimals(3),2,1,"testURI",true,signers[2].address,1);
    const sellerVoucher = new SellerVoucher({_contract:singleMarketplace , _signer:owner});
    const VoucherSell = await sellerVoucher.createVoucher1155(Tseries, owner.address,1,2,expandTo6Decimals(10),1,true,true);
    const buyerVoucher = new BuyerVoucher({_contract:singleMarketplace , _signer:signers[6]});
    const Voucherbuy = await buyerVoucher.createVoucher1155(signers[8].address, signers[6].address,1,2,expandTo6Decimals(10),1,true);
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
    //console.log("treasury balance:",await usdt.balanceOf(owner.address))
    await usdt.connect(owner).transfer(signers[6].address,expandTo6Decimals(1000));
    //console.log("treasury balance:",await usdt.balanceOf(owner.address))
    await usdt.connect(owner).approve(singleMarketplace.address,expandTo6Decimals(1000));
    //console.log("NFT balance of first buyer before buy:",await TRS.balanceOf(signers[6].address,1));
    await expect (singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("AI");
    })

    it("1155buy: counters mismatched",async()=>{
      //create collection
      await factory.connect(owner).create1155Token("T-series", owner.address, superOwner.address,);
      const Tseries = await factory.connect(owner).userNFTContracts(owner.address,0);
      const TRS = await new Template1155__factory(owner).attach(Tseries);
      const addressOfTemplate = Tseries;
      //creating vouchers
      const Template1155Voucher = new template1155Voucher({_contract:TRS , _signer:owner});
      const voucher= await Template1155Voucher.createVoucher(addressOfTemplate,1,expandTo6Decimals(3),2,1,"testURI",true,signers[2].address,1);
      const sellerVoucher = new SellerVoucher({_contract:singleMarketplace , _signer:owner});
      const VoucherSell = await sellerVoucher.createVoucher1155(Tseries, owner.address,1,2,expandTo6Decimals(10),2,true,true);
      const buyerVoucher = new BuyerVoucher({_contract:singleMarketplace , _signer:signers[6]});
      const Voucherbuy = await buyerVoucher.createVoucher1155(Tseries, signers[6].address,1,2,expandTo6Decimals(10),1,true);
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
      //console.log("treasury balance:",await usdt.balanceOf(owner.address))
      await usdt.connect(owner).transfer(signers[6].address,expandTo6Decimals(1000));
      //console.log("treasury balance:",await usdt.balanceOf(owner.address))
      await usdt.connect(owner).approve(singleMarketplace.address,expandTo6Decimals(1000));
      //console.log("NFT balance of first buyer before buy:",await TRS.balanceOf(signers[6].address,1));
      await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("CI");
      })

      it("AI155 buy: mismatched amounts",async()=>{
        //create collection
        await factory.connect(owner).create1155Token("T-series", owner.address, superOwner.address,);
        const Tseries = await factory.connect(owner).userNFTContracts(owner.address,0);
        const TRS = await new Template1155__factory(owner).attach(Tseries);
        const addressOfTemplate = Tseries;
        //creating vouchers
        const Template1155Voucher = new template1155Voucher({_contract:TRS , _signer:owner});
        const voucher= await Template1155Voucher.createVoucher(addressOfTemplate,1,expandTo6Decimals(3),1,1,"testURI",true,signers[2].address,1);
        const sellerVoucher = new SellerVoucher({_contract:singleMarketplace , _signer:owner});
        const VoucherSell = await sellerVoucher.createVoucher1155(Tseries, owner.address,1,2,expandTo6Decimals(10),1,true,true);
        const buyerVoucher = new BuyerVoucher({_contract:singleMarketplace , _signer:signers[6]});
        const Voucherbuy = await buyerVoucher.createVoucher1155(Tseries, signers[6].address,1,2,expandTo6Decimals(10),1,true);
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
        //console.log("treasury balance:",await usdt.balanceOf(owner.address))
        await usdt.connect(owner).transfer(signers[6].address,expandTo6Decimals(1000));
        //console.log("treasury balance:",await usdt.balanceOf(owner.address))
        await usdt.connect(owner).approve(singleMarketplace.address,expandTo6Decimals(1000));
        //console.log("NFT balance of first buyer before buy:",await TRS.balanceOf(signers[6].address,1));
        await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("AMI");
      })    

      it("AI155 buy :price doesn't match",async()=>{
        //create collection
        await factory.connect(owner).create1155Token("T-series", owner.address, superOwner.address,);
        const Tseries = await factory.connect(owner).userNFTContracts(owner.address,0);
        const TRS = await new Template1155__factory(owner).attach(Tseries);
        const addressOfTemplate = Tseries;
        //creating vouchers
        const Template1155Voucher = new template1155Voucher({_contract:TRS , _signer:owner});
        const voucher= await Template1155Voucher.createVoucher(addressOfTemplate,1,expandTo6Decimals(3),2,1,"testURI",true,signers[2].address,1);
        const sellerVoucher = new SellerVoucher({_contract:singleMarketplace , _signer:owner});
        const VoucherSell = await sellerVoucher.createVoucher1155(Tseries, owner.address,1,2,expandTo6Decimals(10),1,true,true);
        const buyerVoucher = new BuyerVoucher({_contract:singleMarketplace , _signer:signers[6]});
        const Voucherbuy = await buyerVoucher.createVoucher1155(Tseries, signers[6].address,1,2,expandTo6Decimals(9),1,true);
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
        //console.log("treasury balance:",await usdt.balanceOf(owner.address))
        await usdt.connect(owner).transfer(signers[6].address,expandTo6Decimals(1000));
        //console.log("treasury balance:",await usdt.balanceOf(owner.address))
        await usdt.connect(owner).approve(singleMarketplace.address,expandTo6Decimals(1000));
        //console.log("NFT balance of first buyer before buy:",await TRS.balanceOf(signers[6].address,1));
        await expect(singleMarketplace.Buy(Voucherbuy, VoucherSell, voucher,voucherNFT,false)).to.be.revertedWith("PI");
      }) 

      describe("setter functions",async()=>{
        it("Set Admin",async()=>{
          await template1155.connect(signers[1]).setAdmin(signers[4].address);
          expect(await template1155.admin()).to.be.eq(signers[4].address);
          })
        it("Set Admin",async()=>{
          await expect(template1155.connect(signers[1]).setAdmin("0x0000000000000000000000000000000000000000")).to.be.revertedWith("");
          })          
          
        it("ERROR Set Admin: msg.sender!= Admin",async()=>{
          await expect(template1155.connect(signers[2]).setAdmin(signers[4].address)).to.be.revertedWith("NA");
          })

    
        it("Set Creator",async()=>{
          await template1155.connect(signers[1]).setCreator(signers[5].address);
          expect(await template1155.creator()).to.be.eq(signers[5].address);
        });
        it("ERROR Set Creator: creator != address(0)",async()=>{
          await expect(template1155.connect(signers[1]).setCreator("0x0000000000000000000000000000000000000000")).to.be.revertedWith("");
        })
        it("ERROR Set Creator : msg.sender!= Admin",async()=>{
          await expect(template1155.connect(signers[2]).setCreator(signers[4].address)).to.be.revertedWith("NA");
        })


        it("updating token address",async()=>{
          await singleMarketplace.setToken(signers[4].address);
          expect(await singleMarketplace.token()).to.be.eq(signers[4].address);
      })
  
      it("updating market wallet address",async()=>{
          await singleMarketplace.setMarketingWallet(signers[4].address);
          expect(await singleMarketplace.marketWallet()).to.be.eq(signers[4].address);
      });
  
      it("Updating treasury wallet address",async()=>{
          await singleMarketplace.settreasury(signers[4].address);
          expect(await singleMarketplace.treasury()).to.be.eq(signers[4].address);
      });
  
      it("Updating market fee amount",async()=>{
          await singleMarketplace.setMarketFee(2);
          expect(await singleMarketplace.marketFee()).to.be.eq(2);
      })
  
       it("transferring admin",async()=>{
          await singleMarketplace.transferAdminRole(signers[4].address);
          expect(await singleMarketplace.admin()).to.be.eq(signers[4].address);
      })

      it("Non-operator calls template1155 create function",async()=>{
        await expect(factory.connect(signers[4]).create1155Token("TestUri",signers[1].address,signers[1].address)).to.be.revertedWith("not operator")
       });
       it("ERROR Redeem: Invalid address", async () => {
        const Template1155Voucher = await new template1155Voucher({_contract: template1155,_signer: signers[1]});
        const voucher = await Template1155Voucher.createVoucher(signers[1].address,1,expandTo6Decimals(10),2,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));
        await expect(template1155.redeem(voucher,signers[2].address,expandTo6Decimals(5))).to.be.revertedWith("IA");
      });
    
      it("ERROR Redeem: Invalid signer", async () => {
      const Template1155Voucher2= await new template1155Voucher({_contract:template1155, _signer:signers[5]});
      const voucher2 = await Template1155Voucher2.createVoucher(template1155.address,1,expandTo6Decimals(10),2,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));
      await expect(template1155.redeem(voucher2,signers[2].address,expandTo6Decimals(5))).to.be.revertedWith("");
      });
    
      it("ERROR Redeem: Voucher used", async () => {
      const Template1155Voucher3= await new template1155Voucher({_contract:template1155, _signer:signers[1]});
      const voucher3= await Template1155Voucher3.createVoucher(template1155.address,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));    
      // await template1155.isApprovedForAll(template1155
      await template1155.connect(signers[1]).redeem(voucher3,signers[2].address,1);
      await expect(template1155.connect(signers[1]).redeem(voucher3,signers[3].address,1)).to.be.revertedWith("VU");
    });
    
    it("ERROR Redeem: Voucher used", async () => {
      const Template1155Voucher3= await new template1155Voucher({_contract:template1155, _signer:signers[1]});
      const voucher3= await Template1155Voucher3.createVoucher(template1155.address,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));    
      // await template1155.isApprovedForAll(template1155
      await template1155.connect(signers[1]).redeem(voucher3,signers[2].address,1);
      await expect(template1155.connect(signers[1]).redeem(voucher3,signers[3].address,1)).to.be.revertedWith("VU");
    });
    
    it("ERROR Redeem: Voucher used", async () => {
      const Template1155Voucher3= await new template1155Voucher({_contract:template1155, _signer:signers[1]});
      const voucher3= await Template1155Voucher3.createVoucher(template1155.address,1,expandTo6Decimals(10),1,1,"TestURI",true,signers[2].address,expandTo6Decimals(0));    
      // await template1155.isApprovedForAll(template1155
      await expect(template1155.redeem(voucher3,signers[2].address,1)).to.be.revertedWith("ERC1155: not approved");
    });
    
    it("Redeem: Voucher amounts ", async () => {
      const Template1155Voucher3= await new template1155Voucher({_contract:template1155, _signer:signers[1]});
      const voucher3= await Template1155Voucher3.createVoucher(template1155.address,1,expandTo6Decimals(10),3,1,"TestURI",true,"0x0000000000000000000000000000000000000000",expandTo6Decimals(0));    
      await template1155.connect(signers[1]).redeem(voucher3,signers[2].address,1);
      await template1155.connect(signers[1]).redeem(voucher3,signers[3].address,1);
      await template1155.connect(signers[1]).redeem(voucher3,signers[5].address,1);
    });
    it("safeBatchTransferFrom ", async () => {
      const Template1155Voucher= await new template1155Voucher({_contract:template1155, _signer:signers[1]});
      const voucher= await Template1155Voucher.createVoucher(template1155.address,1,expandTo6Decimals(10),2,1,"TestURI",true,"0x0000000000000000000000000000000000000000",expandTo6Decimals(0));
      const voucher2= await Template1155Voucher.createVoucher(template1155.address,2,expandTo6Decimals(10),3,1,"TestURI",true,"0x0000000000000000000000000000000000000000",expandTo6Decimals(0));
      await template1155.connect(signers[1]).redeem(voucher,signers[2].address,1);
      await template1155.connect(signers[1]).redeem(voucher2,signers[2].address,1);
      await template1155.connect(signers[2]).safeBatchTransferFrom(signers[2].address,signers[3].address,[1,2],[1,1],[]);
    });

    it("ERROR safeBatchTransferFrom: ERC1155: not approved ", async () => {
      const Template1155Voucher= await new template1155Voucher({_contract:template1155, _signer:signers[1]});
      const voucher= await Template1155Voucher.createVoucher(template1155.address,1,expandTo6Decimals(10),2,1,"TestURI",true,"0x0000000000000000000000000000000000000000",expandTo6Decimals(0));
      const voucher2= await Template1155Voucher.createVoucher(template1155.address,2,expandTo6Decimals(10),3,1,"TestURI",true,"0x0000000000000000000000000000000000000000",expandTo6Decimals(0));
      await template1155.connect(signers[1]).redeem(voucher,signers[2].address,1);
      await template1155.connect(signers[1]).redeem(voucher2,signers[2].address,1);
      await expect(template1155.safeBatchTransferFrom(signers[2].address,signers[3].address,[1,2],[1,1],[])).to.be.revertedWith("ERC1155: not approved");
    
    });
    })
});
 });
