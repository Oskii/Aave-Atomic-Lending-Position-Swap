async function main() {

	const AalpsERC20 = await hre.ethers.getContractFactory("AalpsERC20");
	const aalps = await AalpsERC20.deploy();
	const deployedAapls = await aalps.deployed();

	console.log(`[Setup]: Deployed the AALPS contract to address ${deployedAapls.address}`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});