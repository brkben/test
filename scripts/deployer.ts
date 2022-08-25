import { ethers } from "hardhat";
import {
  Usd,
  Usd__factory,
  Template721,
  Template721__factory,
  TokenFactory,
  TokenFactory__factory,
  HeftyVerseMarketplace721,
  HeftyVerseMarketplace721__factory,
  OwnedUpgradeabilityProxy,
  OwnedUpgradeabilityProxy__factory
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
let usdc : Usd; 
let temp721 : Template721; 
let factory : TokenFactory;
let marketPlace721 : HeftyVerseMarketplace721;
let factoryProxy : OwnedUpgradeabilityProxy;
let market721Proxy : OwnedUpgradeabilityProxy;
let owner: SignerWithAddress;
let signers: SignerWithAddress[];

async function main() {
    signers = await ethers.getSigners();
    owner = signers[0];
    console.log("Owner is , ", owner.address);

    usdc = await new Usd__factory(owner).deploy();
    await usdc.deployed();
    console.log("USDC : ",usdc.address);

    temp721 = await new Template721__factory(owner).deploy();
    await temp721.deployed();
    console.log("Template721 : ",temp721.address);

    factory = await new TokenFactory__factory(owner).deploy();
    await factory.deployed();
    console.log("Factory : ",factory.address);

    factoryProxy = await new OwnedUpgradeabilityProxy__factory(owner).deploy();
    await factoryProxy.deployed();
    console.log("Factory Proxy : ",factoryProxy.address);
    
    await factoryProxy.connect(owner).upgradeTo(factory.address); 
    console.log("Factory upgraded");
    
    marketPlace721 = await new HeftyVerseMarketplace721__factory(owner).deploy();
    await marketPlace721.deployed();
    console.log("Marketplace721 : ",marketPlace721.address);

    market721Proxy = await new OwnedUpgradeabilityProxy__factory(owner).deploy();
    await market721Proxy.deployed();
    console.log("Marketplace721 Proxy : ",market721Proxy.address);

    await market721Proxy.connect(owner).upgradeTo(marketPlace721.address); 
    console.log("Marketplace721 upgraded");
    
    let marketplace721Instance = marketPlace721.attach(market721Proxy.address);
    await marketplace721Instance.connect(owner).initialise(owner.address,"0xa74E3ae01B9d2E3C3dAe9556d7625f2485642812",usdc.address,"0x7B6fBAa772048ed2358088c9fDbDFBb4582B15f0")
    console.log("marketplace initialised");
    
    let factoryInstance = factory.attach(factoryProxy.address);
    await factoryInstance.connect(owner).initialize(temp721.address,temp721.address,marketPlace721.address,marketPlace721.address);
    console.log("factory initialised");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
