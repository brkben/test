const Hre = require("hardhat");

async function main() {

    // await Hre.run("verify:verify", {
    //   //Deployed contract Template1155 address
    //   address: "0xF839f725a2AfcC4A8ea494270714044aB5b56796",
    //   //Path of your main contract.
    //   contract: "contracts/Template1155.sol:Template1155",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Template721 address
    //   address: "0x4EeBf55A99b6784832DBA275e8C3412f15b5a2d0",
    //   //Path of your main contract.
    //   contract: "contracts/Template721.sol:Template721",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Factory address
    //   address: "0xfE1E70B25c16aC9Ec089C864Ef668AEB45C41e2d",
    //   //Path of your main contract.
    //   contract: "contracts/Factory.sol:TokenFactory",
    // });

    // await Hre.run("verify:verify", {
    //   //Deployed contract Marketplace address
    //   address: "0xd50F438b0a04D29d64Eb62ADe83Aa0f5a7EAfec9",
    //   //Path of your main contract.
    //   contract: "contracts/SingleMarket.sol:SingleMarket",
    // });

    // await Hre.run("verify:verify",{
    //   //Deployed contract MarketPlace proxy
    //   address: "0x79475e917e705799184b13Fbb31DA8e886Be55F5",
    //   //Path of your main contract.
    //   contract: "contracts/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
    // });


    // await Hre.run("verify:verify",{
    //   //Deployed contract Factory proxy
    //   address: "0xDa9e500b5Ab914Dab5391b177798DA62Edbc1331",
    //   //Path of your main contract.
    //   contract: "contracts/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy"
    // });
}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});