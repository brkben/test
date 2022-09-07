const Hre = require("hardhat");

async function main() {

    // await Hre.run("verify:verify", {
    //   //Deployed contract Template1155 address
    //   address: "0xcE0D63b05F56838bD8c3794fC024acD77616E5db",
    //   //Path of your main contract.
    //   contract: "contracts/Template1155.sol:Template1155",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Template721 address
    //   address: "0xBF8894E01F3033FFedfBe8F4eB100805dDEE82b4",
    //   //Path of your main contract.
    //   contract: "contracts/Template721.sol:Template721",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Factory address
    //   address: "0xc8b91aea5Ba42F6EAA5e7CbfaD88d585b0865640",
    //   //Path of your main contract.
    //   contract: "contracts/Factory.sol:TokenFactory",
    // });

    await Hre.run("verify:verify", {
      //Deployed contract Marketplace address
      address: "0x645498B8778e54585750e981a28ce19Fbe2F6A52",
      //Path of your main contract.
      contract: "contracts/SingleMarket.sol:SingleMarket",
    });

    await Hre.run("verify:verify",{
      //Deployed contract MarketPlace proxy
      address: "0x36fA1842faf8159F88506c1c5120aC8cC38aD3cd",
      //Path of your main contract.
      contract: "contracts/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
    });


    await Hre.run("verify:verify",{
      //Deployed contract Factory proxy
      address: "0x36fA1842faf8159F88506c1c5120aC8cC38aD3cd",
      //Path of your main contract.
      contract: "contracts/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
    });
}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});