import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import dotenv from "dotenv";
require('hardhat-contract-sizer');
require('solidity-coverage');

dotenv.config();
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

export default {

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
    only: ['Factory', 'Marketplace721', 'Marketplace1155', 'Template721', 'Template1155', 'SingleMarket', 'SingleMarketPlace2', 'SingleMarketPlace3']
  },


  networks: {
    hardhat: {
      // gas: 10000000000,
      allowUnlimitedContractSize: true,

    },
    mumbaitest: {
      url: " https://rpc-mumbai.maticvigil.com/",
      accounts: [`0x${process.env.PVTKEY}`]
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // rinkeby: {
    //   url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
    //   accounts: [`0x${process.env.PVTKEY}`],
    // },
    // testnet: {
    //   url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    //   chainId: 97,
    //   gasPrice: 20000000000,
    //   accounts: {
    //     mnemonic: process.env.TESTNET_MNEMONIC,
    //   },
    // },
  },
  etherscan: {
    apiKey: process.env.API_FOR_MUMBAI,
  },
  solidity: "0.8.14",
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },

  gasReporter: {
    enabled: false,
  },

  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};