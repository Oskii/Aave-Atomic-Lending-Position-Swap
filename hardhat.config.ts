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
		sepolia: {
            url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_ALCHEMY_KEY}`, // Replace with your Alchemy API key
            accounts: [process.env.PRIVATE_KEY_BOB || ""],
        },
    
        polygonMumbai: {
            url: `https://polygon.llamarpc.com`,
            //url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.MUMBAI_ALCHEMY_KEY}`, // Replace with your Alchemy API key
            accounts: [process.env.PRIVATE_KEY_ALICE || ""],
        },
	},
    etherscan: {
        apiKey:{
            sepolia: process.env.SEPOLIA_ETHERSCAN_API_KEY || "",
            polygonMumbai: process.env.MUMBAI_ETHERSCAN_API_KEY || "",
        }
      },
};

export default config;
