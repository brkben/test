import { ethers,network } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

function sleep(ms: any) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    // const signers = await ethers.getSigners();
    // const owner = "0xdb76D742488691cE76c1B8bc326fb0C8d397a2F1";
    // console.log("Owner is , ", owner);
    // // await sleep(4000);

    // const Temp721 = await ethers.getContractFactory("Template721");
    // const temp721 = await Temp721.deploy();
    // await sleep(4000);
    // console.log("Template721 : ",temp721.address);
    

    // const Temp1155 = await ethers.getContractFactory("Template1155");
    // const temp1155= await Temp1155.deploy();
    // await sleep(4000);
    // console.log("Template1155 : ",temp1155.address);

    const factory1 = await ethers.getContractFactory("TokenFactory");
    const factory = await factory1.deploy();
    await sleep(4000);
    console.log("Factory : ",factory.address);

    // const Upgradeability1 = await ethers.getContractFactory("OwnedUpgradeabilityProxy");
    // const proxy1 = await Upgradeability1.deploy();
    // await sleep(4000);
    
    
    // await proxy1.upgradeTo(factory.address); 
    // console.log("Factory upgraded");
    // await sleep(4000);

    // const factoryProxy = await factory1.attach(proxy1.address);
    // await sleep(4000);
    // console.log("Factory proxy",factoryProxy.address);
    
    // const marketPlace1 = await  ethers.getContractFactory("SingleMarket");
    // const marketPlace = await marketPlace1.deploy();
    // await sleep(4000);
    // console.log("Single Marketplace : ",marketPlace.address);

    // const proxy2 = await Upgradeability1.deploy();
    // await sleep(4000);
    // console.log("proxy2", proxy2.address);

    // await proxy2.upgradeTo(marketPlace.address);
    // await sleep(4000);
    // console.log("Single Marketplace upgraded");

    // const marketProxy = await marketPlace1.attach(proxy2.address);
    // await sleep(4000);
    // console.log("Marketplace proxy",factoryProxy.address);
    
    // let marketplaceInstance = marketPlace.attach(marketProxy.address);
    // await marketplaceInstance.initialize("0xdb76D742488691cE76c1B8bc326fb0C8d397a2F1","0xa74E3ae01B9d2E3C3dAe9556d7625f2485642812","0xA4D07ea7eb6B59F5836C8fd7535C9CF911c25cA7","0x7B6fBAa772048ed2358088c9fDbDFBb4582B15f0");
    // await sleep(4000);
    // console.log("marketplace initialized");
    
    // let factoryInstance = factory.attach(factoryProxy.address);
    // await factoryInstance.initialize(temp721.address,temp1155.address,marketPlace.address);
    // await sleep(4000);
    // console.log("factory initialized");


    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
