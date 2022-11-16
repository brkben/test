import { ethers,network } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

function sleep(ms: any) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const signers = await ethers.getSigners();
    const owner = "0xdb76D742488691cE76c1B8bc326fb0C8d397a2F1";
    console.log("Owner is , ", owner);
    await sleep(4000);

    // deploy temp721
    const Temp721 = await ethers.getContractFactory("Template721");
    const temp721 = await Temp721.deploy();
    await sleep(4000);
    console.log("Template721 : ",temp721.address);
    
    // deploy temp1155
    const Temp1155 = await ethers.getContractFactory("Template1155");
    const temp1155= await Temp1155.deploy();
    await sleep(4000);
    console.log("Template1155 : ",temp1155.address);

    // deploy factory implementation
    const factory1 = await ethers.getContractFactory("TokenFactory");
    const factory = await factory1.deploy();
    await sleep(4000);
    console.log("Factory : ",factory.address);

    // deploy factory proxy
    const Upgradeability1 = await ethers.getContractFactory("OwnedUpgradeabilityProxy");
    const proxy1 = await Upgradeability1.deploy();
    await sleep(4000);
    console.log("Factory proxy: ", proxy1.address)
    
    // deploy marketplace implementation
    const marketPlace1 = await  ethers.getContractFactory("SingleMarket");
    const marketPlace = await marketPlace1.deploy();
    await sleep(4000);
    console.log("Single Marketplace : ",marketPlace.address);

    // deploy proxy for marketplace
    const proxy2 = await Upgradeability1.deploy();
    await sleep(4000);
    console.log("proxy2", proxy2.address);

    // create intialise call data for marketplace
    let ABIForMarketplace = [ "function initialize(address _owner, address _marketWallet, address _token, address _treasury)" ];
    let ifaceForMarketplace = new ethers.utils.Interface(ABIForMarketplace);
    let encodeDataMarketplace = ifaceForMarketplace.encodeFunctionData("initialize", [ "0xdb76D742488691cE76c1B8bc326fb0C8d397a2F1","0xa74E3ae01B9d2E3C3dAe9556d7625f2485642812","0xA4D07ea7eb6B59F5836C8fd7535C9CF911c25cA7","0x7B6fBAa772048ed2358088c9fDbDFBb4582B15f0" ])

    // marketplace proxy upgarded and initialised 
    await proxy2.upgradeToAndCall(marketPlace.address, encodeDataMarketplace);
    await sleep(4000);
    console.log("Single Marketplace upgraded");

    // create intialise call data for factory
    let ABI = [ "function initialize(address _template721Address, address _template1155Address, address _proxy, address _marketplace)" ];
    let iface = new ethers.utils.Interface(ABI);
    let encodeDataFactory = iface.encodeFunctionData("initialize", [ temp721.address,temp1155.address,proxy1.address,proxy2.address ])

    // factory proxy upgarded and initialised
    await proxy1.upgradeToAndCall(factory.address, encodeDataFactory); 
    console.log("Factory upgraded and intialised");
    await sleep(4000);

    const factoryProxy = await factory1.attach(proxy1.address);
    await sleep(4000);
    console.log("Factory proxy",factoryProxy.address);

    const marketProxy = await marketPlace1.attach(proxy2.address);
    await sleep(4000);
    console.log("Marketplace proxy",marketProxy.address);
        
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
