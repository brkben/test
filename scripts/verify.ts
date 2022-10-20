const Hre = require("hardhat");

async function main() {

    // await Hre.run("verify:verify", {
    //   //Deployed contract Template1155 address
    //   address: "0xCfB7797e3a5fd6843De672Ff8AF0AE1C688Bdf0d",
    //   //Path of your main contract.
    //   contract: "contracts/Template1155.sol:Template1155",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Template721 address
    //   address: "0x96d91CBA1DEaFBcab45C6e346d1511ce05B236b0",
    //   //Path of your main contract.
    //   contract: "contracts/Template721.sol:Template721",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Factory address
    //   address: "0x6fc696E5590B6749D51be121f3EBE6BDbBEb3982",
    //   //Path of your main contract.
    //   contract: "contracts/Factory.sol:TokenFactory",
    // });

    await Hre.run("verify:verify", {
      //Deployed contract Marketplace address
      address: "0x86041e5e7E57e91CA57f15217F35e2e6aA03BC2d",
      //Path of your main contract.
      contract: "contracts/SingleMarket.sol:SingleMarket",
    });

    // await Hre.run("verify:verify",{
    //   //Deployed contract MarketPlace proxy
    //   address: "0x79475e917e705799184b13Fbb31DA8e886Be55F5",
    //   //Path of your main contract.
    //   contract: "contracts/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
    // });


//     await Hre.run("verify:verify",{
//       //Deployed contract Factory proxy
//       address: "0x2EC3c89D99876CF274Fca4D87FF065D121E422bc",
//       //Path of your main contract.
//       contract: "contracts/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
//     });
}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});