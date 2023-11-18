// SPDX-License-Identifier: Proprietary

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./AalpsLib.sol";

/**
 * @title Atomic Aave Lending Position Swaps (AALPS) for aTokens
 *
 * Introduction:
 * Welcome to the AALPS project! This protocol facilitates trustless, decentralized,
 * and cryptographically secure cross-chain atomic swaps of Aave lending positions (aTokens).
 * It allows the exchange of aTokens for other ERC20 tokens or aTokens across any chains supporting AaveV3.
 *
 * Example Usage:
 * Enables scenarios such as swapping aTokens on Avalanche for USDC on Polygon, or aTokens on Ethereum for those on Avalanche.
 *
 * Mechanism:
 * AALPS uses what is known as a Secure Exchange Protocol (SEP), leveraging one-way hashing of cryptographic secrets
 * and time-constrained actions to ensure safety and atomicity of cross-chain swaps.
 *
 * AALPS is a comprehensive on-chain solution for full interoperability between EVM chains for trading Aave liquidity positions.
 */

contract AalpsERC20 {
	using AalpsLib for AalpsLib.AALPSProposal;

	modifier AALPSInstanceExists(bytes32 _aalpsInstanceId) {
		require(
			alreadyExistsAALPSInstance(_aalpsInstanceId),
			"agreementId does not exist"
		);
		_;
	}

	modifier tokenAmountGTZero(
		address _token,
		address _partyA,
		uint _tokenAmount
	) {
		require(_tokenAmount > 0, "Locked amount must be GT 0");
		require(
			ERC20(_token).allowance(_partyA, address(this)) >= _tokenAmount,
			"Allowance must be GTE amount"
		);
		_;
	}

	/**
	 * The onus is on the proposer to ensure that a reasonable deadline has been selected. Obviously it is not useful to have a deadline
	 * that is shorter than the average time of a block. The proposer should also consider the time it takes to execute the swap on the
	 * other chain plus a reasonable number of confirmations to avoid orphaned blocked. For example, if the proposer is swapping aTokens
	 * on Avalanche for aTokens on Ethereum, they should consider the time it takes to execute the swap on Ethereum.
	 * It could be useful to take an opinionated approach to this and set a minimum deadline on a front-end that is powering this system,
	 * but for simplicity we leave it up to the proposer to decide.
	 */

	modifier deadlineGTNow(uint32 _deadline) {
		//It's ok to compare uint32 with uint256 here because solidity will implicitly convert uint32 to uint256 for the comparison
		//But we save a little morsel of gas when we pass it in as a uint32
		require(_deadline > block.timestamp, "deadline time must be in the future");
		_;
	}

	modifier assetsRefundable(bytes32 _aalpsInstanceId) {
		require(
			!aalpsInstances[_aalpsInstanceId].tokensRefunded,
			"Tokens already refunded"
		);
		require(
			!aalpsInstances[_aalpsInstanceId].tokensWithdrawn,
			"Tokens already withdrawn"
		);
		require(
			aalpsInstances[_aalpsInstanceId].partyA == msg.sender,
			"Refunder is not partyA"
		);
		require(
			aalpsInstances[_aalpsInstanceId].deadline <= block.timestamp,
			"Deadline not yet reached"
		);
		_;
	}

	modifier assetsClaimable(bytes32 _aalpsInstanceId) {
		require(
			aalpsInstances[_aalpsInstanceId].partyB == msg.sender,
			"Claimer is not partyB"
		);
		require(
			!aalpsInstances[_aalpsInstanceId].tokensWithdrawn,
			"Tokens already claimed"
		);
		require(
			!aalpsInstances[_aalpsInstanceId].tokensRefunded,
			"Tokens already refunded"
		);
		_;
	}

	modifier keyOpensLock(bytes32 _aalpsInstanceId, bytes32 _x) {
		require(
			aalpsInstances[_aalpsInstanceId].secretlock == sha256(abi.encodePacked(_x)),
			"secretlock hash does not match"
		);
		_;
	}

	mapping(bytes32 => AalpsLib.AALPSProposal) aalpsInstances;

	/**
     * @dev The proposer partyA sets up a new AALPS and locks their asset inside it
     *
     * _partyB must have already approved the contract to use their tokens.
     *

     * @param _partyB The counter party and receiver of partyA's tokens.
     * @param _secretlock a SHA2 hash of the secret, which partyA may choose.
     * @param _deadline The UNIX time int after which partyA may claim a refund.
     * @param _erc20Contract The actual aToken or ERC20 contract.
     * @param _tokenAmount The number of aTokens or ERC20 to lock into the contract.
     * @return agreementId Unique id representing the AALPS.
     */
	function createAALPSProposal(
		address _partyB,
		bytes32 _secretlock,
		uint32 _deadline,
		address _erc20Contract,
		uint _tokenAmount
	)
		external
		tokenAmountGTZero(_erc20Contract, msg.sender, _tokenAmount)
		deadlineGTNow(_deadline)
		returns (bytes32 agreementId)
	{
		agreementId = sha256(
			abi.encodePacked(
				msg.sender,
				_partyB,
				_erc20Contract,
				_tokenAmount,
				_secretlock,
				_deadline
			)
		);

		// We should not allow numerous AALPs with the same exact parameters (complete duplicates)
		// Otherwise there will be no way to index them and an overwrite vulnerability will be present
		if (alreadyExistsAALPSInstance(agreementId)) {
			revert("Duplicate AALPS already exists");
		}

		//TransferFrom and then update to avoid reentrancy
		if (
			!ERC20(_erc20Contract).transferFrom(msg.sender, address(this), _tokenAmount)
		) {
			revert("transferFrom from partyA failed");
		}

		aalpsInstances[agreementId] = AalpsLib.AALPSProposal(
			msg.sender,
			_partyB,
			_secretlock,
			_deadline,
			_tokenAmount,
			_erc20Contract,
			false,
			false,
			0
		);

		emit AalpsLib.AALPSERC20Lockup(
			agreementId,
			msg.sender,
			_partyB,
			_secretlock,
			_deadline,
			_tokenAmount,
			_erc20Contract
		);
	}

	/**
	 * @dev PartyB claims the tokens locked by PartyA by providing the secret
	 * that was used in the contract creation. This is only possible if PartyA has revealed
	 * the secret to PartyB by claiming PartyB's funds
	 *
	 * @param _aalpsInstanceId The unique identifier for this AALPS instance.
	 * @param _key to be checked against lock using sha256.
	 * @return bool return true if everything worked as expected
	 */

	function withdrawTokens(
		bytes32 _aalpsInstanceId,
		bytes32 _key
	)
		external
		AALPSInstanceExists(_aalpsInstanceId)
		keyOpensLock(_aalpsInstanceId, _key)
		assetsClaimable(_aalpsInstanceId)
		returns (bool)
	{
		AalpsLib.AALPSProposal storage instance = aalpsInstances[_aalpsInstanceId];

		//make that key public
		instance.key = _key;

		//update tokensWithdrawn before transfer to avoid reentrancy
		instance.tokensWithdrawn = true;
		ERC20(instance.erc20Contract).transfer(instance.partyB, instance.tokenAmount);
		emit AalpsLib.AALPSERC20Claimed(_aalpsInstanceId);
		return true;
	}

	/**
	 * @dev Called by the partyA if there was no withdraw AND the time lock has
	 * expired. This will restore ownership of the tokens to the partyA.
	 *
	 * @param _aalpsInstanceId Id of AALPS to refund from.
	 * @return bool true on success
	 */
	function refundTokens(
		bytes32 _aalpsInstanceId
	)
		external
		AALPSInstanceExists(_aalpsInstanceId)
		assetsRefundable(_aalpsInstanceId)
		returns (bool)
	{
		AalpsLib.AALPSProposal storage instance = aalpsInstances[_aalpsInstanceId];
		instance.tokensRefunded = true;
		ERC20(instance.erc20Contract).transfer(instance.partyA, instance.tokenAmount);
		emit AalpsLib.AALPSERC20Redeemed(_aalpsInstanceId);
		return true;
	}

	/**
	 * @dev Get contract details.
	 * @param _aalpsInstanceId AALPS contract id
	 * @return partyA Address of the partyA
	 * @return partyB Address of the partyB
	 * @return erc20Contract ERC20 Token contract address
	 * @return tokenAmount Amount of the token locked
	 * @return secretlock Hash lock of the contract
	 * @return deadline Time lock of the contract (UNIX timestamp)
	 * @return tokensWithdrawn Boolean indicating if the amount was withdrawn
	 * @return tokensRefunded Boolean indicating if the amount was refunded
	 * @return key Preimage for the hash lock
	 */
	function getAALPSInstance(
		bytes32 _aalpsInstanceId
	)
		public
		view
		returns (
			address partyA,
			address partyB,
			address erc20Contract,
			uint tokenAmount,
			bytes32 secretlock,
			uint32 deadline,
			bool tokensWithdrawn,
			bool tokensRefunded,
			bytes32 key
		)
	{
		if (alreadyExistsAALPSInstance(_aalpsInstanceId) == false) {
			return (address(0x0), address(0x0), address(0x0), 0, 0, 0, true, true, 0);
		}
		AalpsLib.AALPSProposal storage instance = aalpsInstances[_aalpsInstanceId];
		return (
			instance.partyA,
			instance.partyB,
			instance.erc20Contract,
			instance.tokenAmount,
			instance.secretlock,
			instance.deadline,
			instance.tokensWithdrawn,
			instance.tokensRefunded,
			instance.key
		);
	}

	/**
	 * @dev Is there a contract with id _aalpsInstanceId.
	 * @param _aalpsInstanceId Id into aalpsInstances mapping.
	 */
	function alreadyExistsAALPSInstance(
		bytes32 _aalpsInstanceId
	) internal view returns (bool doesExist) {
		doesExist = (aalpsInstances[_aalpsInstanceId].partyA != address(0));
	}
}
