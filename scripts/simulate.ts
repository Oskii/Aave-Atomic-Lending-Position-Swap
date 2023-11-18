const hre = require("hardhat");

async function main() {
	/**
	 *  - Jimmy (Party A) has an AaveV3 lending position of 50 DAI on Ethereum, and so holds 50 aDAI.
	 *  - Sandra (Party B) has an AaveV3 lending position of 0.001 WBTC on Arbitrum, and so holds aWBTC.
	 */

	// Deploy the mock ERC20 token
	const Token = await hre.ethers.getContractFactory("MockaToken");
	const tokenA = await Token.deploy("Mock aDAI", "aDai", 18);
	const tokenB = await Token.deploy("Mock aWrappedBitcoin", "aWBTC", 18);
	await tokenA.deployed();
	await tokenB.deployed();

	console.log(`------------------------------------------------------`);
	console.log(`👻 Conducting initial setup!`);
	console.log(`------------------------------------------------------`);

	console.log(`[Setup]: Deployed the mock erc20 token contract`);

	// Deploy the AALPS contract
	const AalpsERC20 = await hre.ethers.getContractFactory("AalpsERC20");
	const aalps = await AalpsERC20.deploy();
	await aalps.deployed();

	console.log(`[Setup]: Deployed the AALPS contract`);

	// Simulate two parties
	const [partyA, partyB] = await hre.ethers.getSigners();

	console.log(`[Setup]: Got the signers`);

	// Party A needs some tokens to swap
	await tokenA.mint(partyA.address, hre.ethers.utils.parseEther("100"));
	console.log(`[Setup]: Minted some mock aDai for Party A`);

	// Party B needs some tokens to swap
	await tokenB.mint(partyB.address, hre.ethers.utils.parseEther("100"));
	console.log(`[Setup]: Minted some mock aWBTC for Party B`);
	console.log(`------------------------------------------------------`);
	console.log(`👻 Setup Complete!`);
	console.log(`👻 Now simulating the AALPS protocol!`);
	console.log(`------------------------------------------------------`);

	// Check balances of each wallet
	const partyAInitialbalanceA = await tokenA.balanceOf(partyA.address);
	const partyAInitialbalanceB = await tokenB.balanceOf(partyA.address);

	const partyBInitialbalanceA = await tokenA.balanceOf(partyB.address);
	const partyBInitialbalanceB = await tokenB.balanceOf(partyB.address);

	console.log(
		`[Party A]: aDai Balance of Party A: ${hre.ethers.utils.formatEther(
			partyAInitialbalanceA,
		)} aDAI`,
	);
	console.log(
		`[Party A]: aWBTC Balance of Party A: ${hre.ethers.utils.formatEther(
			partyAInitialbalanceB,
		)} aWBTC`,
	);
	console.log(
		`[Party B]: aDai Balance of Party B: ${hre.ethers.utils.formatEther(
			partyBInitialbalanceA,
		)} aDAI`,
	);
	console.log(
		`[Party B]: aWBTC Balance of Party B: ${hre.ethers.utils.formatEther(
			partyBInitialbalanceB,
		)} aWBTC`,
	);

	// Party A approves AALPS contract to spend tokens
	await tokenA
		.connect(partyA)
		.approve(aalps.address, hre.ethers.utils.parseEther("50"));
	console.log(`[Party A]: Approved tokens`);

	// Party B approves AALPS contract to spend tokens
	await tokenB
		.connect(partyB)
		.approve(aalps.address, hre.ethers.utils.parseEther("0.001"));
	console.log(`[Party B]: Approved tokens`);

	// Party A creates a new AALPS proposal
	const secret = "mysecuresecret!!!#@904saljkd";
	const bytes32EncodedSecret = hre.ethers.utils.formatBytes32String(secret);
	const secretHash = hre.ethers.utils.sha256(bytes32EncodedSecret);
	const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 5; // 5 hours from now

	console.log(`[Party A]: Got secret ${secret}`);
	console.log(`[Party A]: Bytes32 encoded secret is  ${bytes32EncodedSecret}`);
	console.log(`[Party A]: Got secretHash ${secretHash}`);
	console.log(`[Party A]: Got deadline ${deadline}`);

	const createAALPSProposal = await aalps
		.connect(partyA)
		.createAALPSProposal(
			partyB.address,
			secretHash,
			deadline,
			tokenA.address,
			hre.ethers.utils.parseEther("50"),
		);

	console.log(`[Party A]: Party A created a new AALPS proposal`);

	const txReceipt = await createAALPSProposal.wait();
	const proposalCreatedEvent = txReceipt.events.find(
		(event) => event.event === "AALPSERC20Lockup",
	);
	const proposalId = proposalCreatedEvent.args.agreementId;

	console.log(`[Party A]: Got Party A's proposalId ${proposalId}`);

	console.log(`[Party A]: Party A waiting for Party B to lock...`);

	const deadlineB = Math.floor(Date.now() / 1000) + 60 * 60 * 3; // 3 hours from now

	console.log(`[Party B]: Party B approved 10 tokens`);

	const createAALPSProposalB = await aalps
		.connect(partyB)
		.createAALPSProposal(
			partyA.address,
			secretHash,
			deadlineB,
			tokenB.address,
			hre.ethers.utils.parseEther("0.001"),
		);

	console.log(`[Party B]: Party B created a new AALPS proposal`);

	const txReceiptB = await createAALPSProposalB.wait();
	const proposalCreatedEventB = txReceiptB.events.find(
		(event) => event.event === "AALPSERC20Lockup",
	);
	const proposalIdB = proposalCreatedEventB.args.agreementId;

	console.log(`[Party B]: Got Party B's proposalId ${proposalIdB}`);

	// Party A withdraws Party B’s funds using the secret
	await aalps.connect(partyA).withdrawTokens(proposalIdB, bytes32EncodedSecret);

	console.log(`[Party A]: Party A withdrew Party B's funds`);

	// The secret is now publicly available because Party A has withdrawn Party B’s funds and exposed it
	const AALPSInstance = await aalps
		.connect(partyB)
		.getAALPSInstance(proposalIdB);
	const publiclyAvailableSecret = AALPSInstance["key"];

	console.log(
		`[Party B]: The publicly available secret is ${publiclyAvailableSecret}`,
	);

	// Party B now knows the secret and can withdraw Party A’s funds
	await aalps
		.connect(partyB)
		.withdrawTokens(proposalId, publiclyAvailableSecret);

	console.log(`[Party B]: Party B withdrew Party A's funds`);

	// Check balances of each wallet
	const partyAbalanceA = await tokenA.balanceOf(partyA.address);
	const partyAbalanceB = await tokenB.balanceOf(partyA.address);

	const partyBbalanceA = await tokenA.balanceOf(partyB.address);
	const partyBbalanceB = await tokenB.balanceOf(partyB.address);

	console.log(`------------------------------------------------------`);
	console.log(`👻 Aave Atomic Liquidity Position Swap Complete!`);
	console.log(`👻 Checking balances of participants`);
	console.log(`------------------------------------------------------`);

	console.log(
		`[Party A]: aDai Balance of Party A: ${hre.ethers.utils.formatEther(
			partyAbalanceA,
		)} aDAI`,
	);
	console.log(
		`[Party A]: aWBTC Balance of Party A: ${hre.ethers.utils.formatEther(
			partyAbalanceB,
		)} aWBTC`,
	);
	console.log(
		`[Party B]: aDai Balance of Party B: ${hre.ethers.utils.formatEther(
			partyBbalanceA,
		)} aDAI`,
	);
	console.log(
		`[Party B]: aWBTC Balance of Party B: ${hre.ethers.utils.formatEther(
			partyBbalanceB,
		)} aWBTC`,
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
