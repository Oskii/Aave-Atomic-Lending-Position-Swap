import { ethers } from "hardhat";
import { expect } from "chai";
import { MockaToken, AalpsERC20 } from "../../typechain-types"; // Adjust the import paths
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Testing flow outliers and unhappy paths", function () {
	let tokenA: MockaToken;
	let tokenB: MockaToken;
	let aalps: AalpsERC20;
	let partyA: SignerWithAddress;
	let partyB: SignerWithAddress;

	let deadlineA: number;
	let deadlineB: number;

	beforeEach(async function () {
		// Deploy the mock ERC20 token
		const Token = await hre.ethers.getContractFactory("MockaToken");
		[partyA, partyB] = await hre.ethers.getSigners();

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

	it("Should not not allow an impossibly short lockup deadline", async function () {
		const currentBlock = await ethers.provider.getBlock("latest");
		const blockTime = currentBlock.timestamp;
		deadlineA = blockTime;

		const secretSeed = "correct_secret";
		const bytes32EncodedSecret = ethers.utils.sha256(
			ethers.utils.toUtf8Bytes(secretSeed),
		);
		const secretHash = ethers.utils.sha256(bytes32EncodedSecret);

		// Party A creates a new AALPS proposal
		await expect(
			aalps
				.connect(partyA)
				.createAALPSProposal(
					partyB.address,
					secretHash,
					deadlineA,
					tokenA.address,
					ethers.utils.parseEther("50"),
				),
		).to.be.revertedWith("deadline time must be in the future");
	});

	it("Should not not allow a refund twice", async function () {
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

		//wait 7 seconds
		await new Promise((resolve) => setTimeout(resolve, 5000));

		//mine a block
		await ethers.provider.send("evm_mine", []);

		const proposalIdA = proposalCreatedEventA?.args?.agreementId;

		await expect(aalps.connect(partyA).refundTokens(proposalIdA)).to.not.be
			.reverted;
		await expect(
			aalps.connect(partyA).refundTokens(proposalIdA),
		).to.be.revertedWith("Tokens already refunded");
	});

	it("Should not allow a withdrawal twice", async function () {
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

		// Party B successfully withdraws tokens using the secret
		await expect(
			aalps.connect(partyB).withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).not.to.be.reverted;

		// Party B's second attempt to withdraw tokens should revert
		await expect(
			aalps.connect(partyB).withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.be.revertedWith("Tokens already claimed");
	});

	it("Should not allow the wrong party to refund", async function () {
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

		// Party B successfully withdraws tokens using the secret
		await expect(
			aalps.connect(partyB).refundTokens(proposalIdA),
		).to.be.revertedWith("Refunder is not partyA");
	});

    it("Should not allow a refund before the deadline", async function () {

        const currentBlock = await ethers.provider.getBlock("latest");
		const blockTime = currentBlock.timestamp;

		deadlineA = blockTime + (60 * 60 * 10); // Party A's deadline is 10 hours later.
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

		// Party B successfully withdraws tokens using the secret
		await expect(
			aalps.connect(partyA).refundTokens(proposalIdA),
		).to.be.revertedWith("Deadline not yet reached");
	});

    it("Should not allow partyA to claim its own lockup tokens", async function () {

        const currentBlock = await ethers.provider.getBlock("latest");
		const blockTime = currentBlock.timestamp;

		deadlineA = blockTime + (60 * 60 * 10); // Party A's deadline is 10 hours later.
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

		// Party B successfully withdraws tokens using the secret
		await expect(
			aalps.connect(partyA).withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.be.revertedWith("Claimer is not partyB");
	});

    it("Should not allow the same AALPS instance to be created twice ", async function () {
        const currentBlock = await ethers.provider.getBlock("latest");
        const blockTime = currentBlock.timestamp;
    
        deadlineA = blockTime + (60 * 60 * 10); // Party A's deadline is 10 hours later.
        const secretSeed = "correct_secret";
        const bytes32EncodedSecret = ethers.utils.sha256(
            ethers.utils.toUtf8Bytes(secretSeed),
        );
        const secretHash = ethers.utils.sha256(bytes32EncodedSecret);
    
        // Party A creates a new AALPS proposal
        await expect(
            aalps.connect(partyA).createAALPSProposal(
                partyB.address,
                secretHash,
                deadlineA,
                tokenA.address,
                ethers.utils.parseEther("25"),
            )
        ).not.to.be.reverted;
    
        // Expect the second attempt to create the same AALPS proposal to revert
        await expect(
            aalps.connect(partyA).createAALPSProposal(
                partyB.address,
                secretHash,
                deadlineA,
                tokenA.address,
                ethers.utils.parseEther("25"),
            )
        ).to.be.revertedWith("Duplicate AALPS already exists");
    });
});
