import { ethers } from "hardhat";
import { expect } from "chai";
import { MockaToken, AalpsERC20 } from "../../typechain-types"; // Adjust the import paths
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Testing to see if outsider addresses can interfere", function () {
	let tokenA: MockaToken;
	let tokenB: MockaToken;
	let aalps: AalpsERC20;
	let partyA: SignerWithAddress;
	let partyB: SignerWithAddress;
	let partyOutsider: SignerWithAddress;

	let deadlineA: number;
	let deadlineB: number;

	beforeEach(async function () {
		// Deploy the mock ERC20 token
		const Token = await hre.ethers.getContractFactory("MockaToken");
		[partyA, partyB, partyOutsider] = await hre.ethers.getSigners();

		tokenA = await Token.deploy("Mock aDAI", "aDai", 18);
		tokenB = await Token.deploy("Mock aWrappedBitcoin", "aWBTC", 18);
		await tokenA.deployed();
		await tokenB.deployed();

		const AalpsERC20 = await hre.ethers.getContractFactory("AalpsERC20");
		aalps = await AalpsERC20.deploy();
		await aalps.deployed();

		await tokenA.mint(partyA.address, hre.ethers.utils.parseEther("100"));
		await tokenB.mint(partyB.address, hre.ethers.utils.parseEther("100"));

		await tokenA
			.connect(partyA)
			.approve(aalps.address, hre.ethers.utils.parseEther("50"));

		await tokenB
			.connect(partyB)
			.approve(aalps.address, hre.ethers.utils.parseEther("0.001"));

		deadlineA = Math.floor(Date.now() / 1000) + 60 * 60 * 5; // Party A's deadline
		deadlineB = Math.floor(Date.now() / 1000) + 60 * 60 * 3; // Party B's deadline
	});

	it("Should not allow a random address to claim someone elses AALPS tokens with the correct secret", async function () {
		const secretSeed = "correct_secret";
		const bytes32EncodedSecret = ethers.utils.sha256(
			ethers.utils.toUtf8Bytes(secretSeed),
		);
		const secretHash = ethers.utils.sha256(bytes32EncodedSecret);

		// Party A creates a new AALPS proposal
		const createAALPSProposalA = await aalps
			.connect(partyA)
			.createAALPSProposal(
				partyB.address,
				secretHash,
				deadlineA,
				tokenA.address,
				ethers.utils.parseEther("50"),
			);

		const txReceiptA = await createAALPSProposalA.wait();
		const proposalCreatedEventA = txReceiptA?.events?.find(
			(event) => event.event === "AALPSERC20Lockup",
		);

		const proposalIdA = proposalCreatedEventA?.args?.agreementId;

		await expect(
			aalps
				.connect(partyOutsider)
				.withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.be.revertedWith("Claimer is not partyB");
	});

	it("Should not allow a random address to refund someone elses AALPS tokens with the correct secret", async function () {
		const currentBlock = await ethers.provider.getBlock("latest");
		const blockTime = currentBlock.timestamp;

		deadlineA = blockTime + 3; // Party A's deadline is 3 seconds later.

		const secretSeed = "correct_secret";
		const bytes32EncodedSecret = ethers.utils.sha256(
			ethers.utils.toUtf8Bytes(secretSeed),
		);
		const secretHash = ethers.utils.sha256(bytes32EncodedSecret);

		// Party A creates a new AALPS proposal
		const createAALPSProposalA = await aalps
			.connect(partyA)
			.createAALPSProposal(
				partyB.address,
				secretHash,
				deadlineA,
				tokenA.address,
				ethers.utils.parseEther("50"),
			);

		const txReceiptA = await createAALPSProposalA.wait();
		const proposalCreatedEventA = txReceiptA?.events?.find(
			(event) => event.event === "AALPSERC20Lockup",
		);

		//wait 5 seconds
		await new Promise((resolve) => setTimeout(resolve, 5000));

		//mine a block
		await ethers.provider.send("evm_mine", []);

		const proposalIdA = proposalCreatedEventA?.args?.agreementId;

		await expect(
			aalps.connect(partyOutsider).refundTokens(proposalIdA),
		).to.be.revertedWith("Refunder is not partyA");
	});
});
