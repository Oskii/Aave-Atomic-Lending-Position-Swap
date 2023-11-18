import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
	solidity: "0.8.20",
	networks: {
		// Example of Ethereum Mainnet
		mainnet: {
			url: process.env.MUMBAI_RPC_URL,
			accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
		// Example of Rinkeby Testnet
		rinkeby: {
			url: process.env.SEPOLIA_RPC_URL,
			accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
	},
};

export default config;