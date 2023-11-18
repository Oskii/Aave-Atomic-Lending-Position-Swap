import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
	solidity: "0.8.20",
	typechain: {
		outDir: "typechain", // Directory for generated types
		target: "ethers-v5",
	},
	networks: {
		// Example of Ethereum Mainnet
		mumbai: {
			url: process.env.MUMBAI_RPC_URL,
			accounts:
				process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
		// Example of Rinkeby Testnet
		sepolia: {
			url: process.env.SEPOLIA_RPC_URL,
			accounts:
				process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
	},
};

export default config;
