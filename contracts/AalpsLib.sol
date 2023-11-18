// SPDX-License-Identifier: Proprietary
pragma solidity ^0.8.20;

library AalpsLib {
	struct AALPSProposal {
		address partyA;
		address partyB;
		bytes32 secretlock; //Byte packing here provides some gas optimizations
		uint32 deadline; // 32 + 32 = 64 bytes
		uint tokenAmount;
		address erc20Contract;
		bool tokensWithdrawn;
		bool tokensRefunded;
		bytes32 key;
	}

	event AALPSERC20Claimed(bytes32 indexed agreementId);

	event AALPSERC20Redeemed(bytes32 indexed agreementId);

	event AALPSERC20Lockup(
		bytes32 indexed agreementId,
		address indexed partyA,
		address indexed partyB,
		bytes32 secretlock,
		uint32 deadline,
		uint tokenAmount,
		address erc20Contract
	);
}
