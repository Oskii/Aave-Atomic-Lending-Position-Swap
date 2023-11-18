import { ethers } from "hardhat";
import { expect } from "chai";
import { MockaToken, AalpsERC20 } from "../../typechain-types"; // Adjust the import paths
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Testing the AALPS' secret functionality", function () {
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

	it("Should handle a long secret for atomic swaps", async function () {
		const secretSeed = "mysecuresecret!!!#@904saljkd";
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

		// Party B creates a new AALPS proposal
		const createAALPSProposalB = await aalps
			.connect(partyB)
			.createAALPSProposal(
				partyA.address,
				secretHash,
				deadlineB,
				tokenB.address,
				ethers.utils.parseEther("0.001"),
			);

		const txReceiptB = await createAALPSProposalB.wait();
		const proposalCreatedEventB = txReceiptB?.events?.find(
			(event) => event.event === "AALPSERC20Lockup",
		);

		const proposalIdB = proposalCreatedEventB?.args?.agreementId;

		// Party A and B withdraw funds using the secret
		// Note: In a real scenario, you would retrieve the actual secrets contract events
		// but we are not testing that in this test. Other tests will cover that,
		// we are just ensuring that the secret is handled correctly in this one

		expect(
			await aalps
				.connect(partyA)
				.withdrawTokens(proposalIdB, bytes32EncodedSecret),
		).to.not.be.reverted;
		expect(
			await aalps
				.connect(partyB)
				.withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.not.be.reverted;
	});

	it("Should handle a small secret seed for atomic swaps", async function () {
		const secretSeed = "a";
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

		// Party B creates a new AALPS proposal
		const createAALPSProposalB = await aalps
			.connect(partyB)
			.createAALPSProposal(
				partyA.address,
				secretHash,
				deadlineB,
				tokenB.address,
				ethers.utils.parseEther("0.001"),
			);

		const txReceiptB = await createAALPSProposalB.wait();
		const proposalCreatedEventB = txReceiptB?.events?.find(
			(event) => event.event === "AALPSERC20Lockup",
		);

		const proposalIdB = proposalCreatedEventB?.args?.agreementId;

		// Party A and B withdraw funds using the secret
		// Note: In a real scenario, you would retrieve the actual secrets contract events
		// but we are not testing that in this test. Other tests will cover that,
		// we are just ensuring that the secret is handled correctly in this one

		expect(
			await aalps
				.connect(partyA)
				.withdrawTokens(proposalIdB, bytes32EncodedSecret),
		).to.not.be.reverted;
		expect(
			await aalps
				.connect(partyB)
				.withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.not.be.reverted;
	});

	it("Should handle secrets with strange characters", async function () {
		const secretSeed =
			"😄 😄 😄 😄 😄 text😄 🥸 🤩 🥳some more text 😏 😒 😞 😔 😟 h̸̢̤͓̫̳̰͇͓̘̫͗͒̈͂͒̽͊̂͂͂͐̀́͘e̶̛̖̿͐̌̈́̍͒̅̿̑̑͆̂͝ ̴̤̤̟͍͍̝̜̗͉͖̝̾̔̐̀̍̔̊̆̀̈́̍͜ͅc̴͉̼̥͚̱̱̍ò̷̢̖͇̞̭̲̹̽̓̂̍͝m̸͍͇̙͎̱̥̺͉͇̈́̇̋̊̈́̈͆̄̚͜e̷̺͚͙̼͙̭̞̣̩̘̟̱̜͓̥͊̒̈́̽̿͊̉̓̀̂̕͠͝͝s̶̡͔̣͓̗̫̤͓̗̹͉̭̹͚̐̐̊̿͒͛̄͋̉͋́̈́͜͠😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 ";
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

		// Party B creates a new AALPS proposal
		const createAALPSProposalB = await aalps
			.connect(partyB)
			.createAALPSProposal(
				partyA.address,
				secretHash,
				deadlineB,
				tokenB.address,
				ethers.utils.parseEther("0.001"),
			);

		const txReceiptB = await createAALPSProposalB.wait();
		const proposalCreatedEventB = txReceiptB?.events?.find(
			(event) => event.event === "AALPSERC20Lockup",
		);

		const proposalIdB = proposalCreatedEventB?.args?.agreementId;

		// Party A and B withdraw funds using the secret
		// Note: In a real scenario, you would retrieve the actual secrets contract events
		// but we are not testing that right now, we are just ensuring that the secret is handled correctly
		// and assuming we would be getting it from the chain

		expect(
			await aalps
				.connect(partyA)
				.withdrawTokens(proposalIdB, bytes32EncodedSecret),
		).to.not.be.reverted;
		expect(
			await aalps
				.connect(partyB)
				.withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.not.be.reverted;
	});

	it("Should successfully get the publicly exposed secret from the event topics after party A claims from party B", async function () {
		const secretSeed = "verysecuresecret*@()%$J$@)J@$#%_U";
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

		const createAALPSProposalB = await aalps
			.connect(partyB)
			.createAALPSProposal(
				partyA.address,
				secretHash,
				deadlineB,
				tokenB.address,
				ethers.utils.parseEther("0.001"),
			);

		const txReceiptB = await createAALPSProposalB.wait();
		const proposalCreatedEventB = txReceiptB?.events?.find(
			(event) => event.event === "AALPSERC20Lockup",
		);

		const proposalIdB = proposalCreatedEventB?.args?.agreementId;

		await aalps.connect(partyA).withdrawTokens(proposalIdB, bytes32EncodedSecret);

		const AALPSInstance = await aalps
			.connect(partyB)
			.getAALPSInstance(proposalIdB);
		const publiclyAvailableSecret = AALPSInstance["key"];

		// Party B now knows the secret and can withdraw Party A’s funds
		expect(
			await aalps
				.connect(partyB)
				.withdrawTokens(proposalIdA, publiclyAvailableSecret),
		).to.not.be.reverted;
	});

	it("Should fail with an incorrect secret", async function () {
		const secretSeed = "correct_secret";
		const incorrectSecretSeed = "incorrect_secret";
		const bytes32EncodedIncorrectSecret = ethers.utils.sha256(
			ethers.utils.toUtf8Bytes(incorrectSecretSeed),
		);
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
				.connect(partyB)
				.withdrawTokens(proposalIdA, bytes32EncodedIncorrectSecret),
		).to.be.revertedWith("secretlock hash does not match");
	});

	it("Should unlock funds with correct secret", async function () {
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
			aalps.connect(partyB).withdrawTokens(proposalIdA, bytes32EncodedSecret),
		).to.not.be.reverted;
	});
});
