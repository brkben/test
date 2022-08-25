const Hre = require("hardhat");

async function main() {

    await Hre.run("verify:verify", {
      //Deployed contract USDT address
      address: "0xE7f56CE5709D8A7E00561399CEcA8da658B9D2c3",
      //Path of your main contract.
      contract: "contracts/USDT.sol:Usd",
    });

    await Hre.run("verify:verify", {
      //Deployed contract TemplateNFT address
      address: "0x1BD5EAF7C9F583181D13aEe39251D87DEA28852f",
      //Path of your main contract.
      contract: "contracts/Template721.sol:Template721",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Factory address
      address: "0x1B39D391749000859f2856345A800ed219A19754",
      //Path of your main contract.
      contract: "contracts/Factory.sol:TokenFactory",
    });

    await Hre.run("verify:verify", {
      //Deployed contract Temp1155 address
      address: "0x3F14d0F3f2321aBEEF4D306913B598F412dB61C2",
      //Path of your main contract.
      contract: "contracts/Marketplace721.sol:HeftyVerseMarketplace721",
    });
}
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});