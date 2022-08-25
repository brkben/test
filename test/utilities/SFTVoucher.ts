// import { ethers ,waffle} from "hardhat";

const SIGNING_DOMAIN_NAME = "HeftyVerse_NFT_Voucher"; // encode krne ke liye salt lgti hai  ex:-  adding formula  values alg dono ki 2 persons
const SIGNING_DOMAIN_VERSION = "1";

class template1155Voucher {
  public contract: any;
  public signer: any;
  public _domain: any;
  public voucherCount: number = 0;
  public signer2: any;

  constructor(data: any) {
    const { _contract, _signer } = data;
    this.contract = _contract;
    this.signer = _signer;
    // console.log(_signer.address,_contract.address,"contract and address");
  }

  async createVoucher(
    nftAddress: any,
    tokenId: any,
    price: any,
    amount: any,
    counter: any,
    tokenUri: any,
    toMint: any,
    royaltyKeeper: any,
    royaltyFees: any
  ) {
    const voucher = {
      nftAddress,
      tokenId,
      price,
      amount,
      counter,
      tokenUri,
      toMint,
      royaltyKeeper,
      royaltyFees,
    };
    const domain = await this._signingDomain();
    const types = {
      SFTvoucher: [
        { name: "nftAddress", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "price", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "counter", type: "uint256" },
        { name: "tokenUri", type: "string" },
        { name: "toMint", type: "bool" },
        { name: "royaltyKeeper", type: "address" },
        { name: "royaltyFees", type: "uint96" },
      ],
    };
    // console.log("let me know",voucher);
    // console.log("let me domain",domain);
    // console.log("let me signer",this.signer.address);

    const signature = await this.signer._signTypedData(domain, types, voucher);
    // console.log("signature",signature);
    // console.log(voucher,"voucher");
    return {
      ...voucher,
      signature,
    };
  }

  async _signingDomain() {
    if (this._domain != null) {
      return this._domain;
    }
    const chainId = 31337;
    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      verifyingContract: this.contract.address,
      chainId,
    };
    return this._domain;
  }
}

export default template1155Voucher;
