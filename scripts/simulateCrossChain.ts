const { ethers } = require("hardhat");

const aWrappedETHAddresses = {
    polygonMumbai: "0xaCA5e6a7117F54B34B476aB95Bf3034c304e7a81",
    sepolia: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830"
};

const aalpsAddresses = {
    polygonMumbai: "0x0Ac42b02BFE612454Ea6706Ad910e4d8AF79076e",
    sepolia: "0x537D205A880ea1d927Acb2cb88d16B6D017bE46f"
};

const userEOAs = {
    Alice: "0xDf7827462B486c37e29A4b319c2B432413a14c39",
    Bob: "0x4f74f405E4b3527224ecAA517C49CeC95376E81B"
};

async function checkBalance(network:string, tokenAddress:string, userName:string, userAddress:string, rpcUrl:string) {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const tokenContract = new ethers.Contract(tokenAddress, ["function balanceOf(address) view returns (uint256)"], provider);
    const balance = await tokenContract.balanceOf(userAddress);
    console.log(`[${network}]: Balance of ${userName} (${userAddress}) is ${ethers.utils.formatEther(balance)} aWrappedETH`);
}

async function main() {
    console.log(`------------------------------------------------------`);
	console.log(`👻 Checking balances of participants`);
	console.log(`------------------------------------------------------`);
    // Check balances on both networks
    await checkBalance("polygonMumbai", aWrappedETHAddresses.polygonMumbai, "Alice", userEOAs.Alice, process.env.MUMBAI_RPC_URL || "");
    await checkBalance("polygonMumbai", aWrappedETHAddresses.polygonMumbai, "Bob", userEOAs.Bob, process.env.MUMBAI_RPC_URL || "");
    await checkBalance("sepolia", aWrappedETHAddresses.sepolia, "Alice", userEOAs.Alice, process.env.SEPOLIA_RPC_URL || "");
    await checkBalance("sepolia", aWrappedETHAddresses.sepolia, "Bob", userEOAs.Bob, process.env.SEPOLIA_RPC_URL || "");

    console.log(`------------------------------------------------------`);
	console.log(`👻 Starting cross-chain swap of aTokens! [aWETH <---> aWMATIC]`);
	console.log(`------------------------------------------------------`);

    const secretSeed = "mysecuresecret!!!#@904saljkd";
    const bytes32EncodedSecret = ethers.utils.sha256(ethers.utils.toUtf8Bytes(secretSeed));
    const secretHash = ethers.utils.sha256(bytes32EncodedSecret);

    console.log("[polygon mumbai]: Alice created secret bytes32 " + bytes32EncodedSecret);
    console.log("[polygon mumbai]: Alice created secret hash " + secretHash);

    // Execute logic for each network
    const providerMumbai = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC_URL);

    //Hardhat does not natively support multiple chains in one deployment, but you can hack it by reinvoking the provider
    var AliceWallet = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, providerMumbai);

    const aWrappedETHMumbai = await ethers.getContractAt("IERC20", aWrappedETHAddresses.polygonMumbai, AliceWallet);
    const aalpsERC20Mumbai = await ethers.getContractAt("AalpsERC20", aalpsAddresses.polygonMumbai, AliceWallet);

    const approveTx = await aWrappedETHMumbai.approve(aalpsERC20Mumbai.address, ethers.utils.parseEther("0.0001"), {gasPrice: 2000000000});
    console.log("[polygon mumbai]: Approval Transaction hash:", approveTx.hash);
    const receipt = await approveTx.wait();
    console.log("[polygon mumbai]: Transaction was mined in block number:", receipt.blockNumber);

    
    const deadlineAlice = Math.floor(Date.now() / 1000) + 60 * 60 * 5; // 5 hours from now

    const createAALPSProposalA = await aalpsERC20Mumbai.connect(AliceWallet).createAALPSProposal(
        userEOAs.Bob,
        secretHash,
        deadlineAlice,
        aWrappedETHAddresses.polygonMumbai,
        ethers.utils.parseEther("0.001"),
        {gasPrice: 2000000000}
    );
    console.log("[polygon mumbai]: Alice created a new AALPS proposal on Mumbai. Transaction hash: ", createAALPSProposalA.hash);

    const txReceiptA = await createAALPSProposalA.wait();
	const proposalCreatedEventA = txReceiptA.events.find(
		(event: any) => event.event === "AALPSERC20Lockup",
	);
	const proposalIdA = proposalCreatedEventA.args.agreementId;
    
    const providerSepolia = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    var BobWallet = new ethers.Wallet(process.env.PRIVATE_KEY_BOB, providerSepolia);

    const aWrappedETHSepolia = await ethers.getContractAt("IERC20", aWrappedETHAddresses.sepolia, BobWallet);
    const aalpsERC20Sepolia = await ethers.getContractAt("AalpsERC20", aalpsAddresses.sepolia, BobWallet);

    await aWrappedETHSepolia.approve(aalpsERC20Sepolia.address, ethers.utils.parseEther("0.0001"));
    console.log("[sepolia]: Bob approved tokens");

    const deadlineBob = Math.floor(Date.now() / 1000) + 60 * 60 * 3; // 3 hours from now

    const createAALPSProposalB = await aalpsERC20Sepolia.connect(BobWallet).createAALPSProposal(
        userEOAs.Alice,
        secretHash,
        deadlineBob,
        aWrappedETHAddresses.sepolia,
        ethers.utils.parseEther("0.001"),
        {gasPrice: 2000000000}
    );
    console.log("[sepolia]: Bob created a new AALPS proposal on Sepolia. Transaction hash: ", createAALPSProposalB.hash);

    const txReceiptB = await createAALPSProposalB.wait();
	const proposalCreatedEventB = txReceiptB.events.find(
		(event: any) => event.event === "AALPSERC20Lockup",
	);
	const proposalIdB = proposalCreatedEventB.args.agreementId;

	console.log(`[sepolia]: Got Bob's proposalId ${proposalIdB}`);


    //Switch back to Sepolia
    AliceWallet = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, providerSepolia);


	// Alice withdraws Bob’s funds using the secret
	const withdrawTxA = await aalpsERC20Sepolia.connect(AliceWallet).withdrawTokens(proposalIdB, bytes32EncodedSecret, {gasPrice: 2000000000});

    console.log(`[sepolia]: Alice withdrew Bob's funds on Sepolia. Transaction hash: `, withdrawTxA.hash);

    // Wait for the transaction to be mined
    await withdrawTxA.wait();

    // The secret is now publicly available because Alice has withdrawn Bob’s funds and exposed it
	const AALPSInstance = await aalpsERC20Sepolia
    .connect(BobWallet)
    .getAALPSInstance(proposalIdB);

    console.log(`[sepolia]: Got the AALPSInstance from proposalId ${proposalIdB} to get the exposed secret`);

    const publiclyAvailableSecret = AALPSInstance["key"];

    console.log(
		`[sepolia]: The publicly available secret is ${publiclyAvailableSecret}`,
	);

    //Switch back to Mumbai
    BobWallet = new ethers.Wallet(process.env.PRIVATE_KEY_BOB, providerMumbai);

	// Bob now knows the secret and can withdraw Alice’s funds
	const withdrawTxB =await aalpsERC20Mumbai
		.connect(BobWallet)
		.withdrawTokens(proposalIdA, publiclyAvailableSecret, {gasPrice: 2000000000});
    
    // Wait for the transaction to be mined
    await withdrawTxB.wait();

    console.log(`[polygon mumbai]: Bob withdrew Alice's funds on Mumbai. Transaction hash: `, withdrawTxB.hash);

    console.log(`------------------------------------------------------`);
	console.log(`👻 Aave Atomic Liquidity Position Swap Complete!`);
	console.log(`👻 Checking balances of participants`);
	console.log(`------------------------------------------------------`);
	
    await checkBalance("polygonMumbai", aWrappedETHAddresses.polygonMumbai, "Alice", userEOAs.Alice, process.env.MUMBAI_RPC_URL || "");
    await checkBalance("polygonMumbai", aWrappedETHAddresses.polygonMumbai, "Bob", userEOAs.Bob, process.env.MUMBAI_RPC_URL || "");
    await checkBalance("sepolia", aWrappedETHAddresses.sepolia, "Alice", userEOAs.Alice, process.env.SEPOLIA_RPC_URL || "");
    await checkBalance("sepolia", aWrappedETHAddresses.sepolia, "Bob", userEOAs.Bob, process.env.SEPOLIA_RPC_URL || "");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
