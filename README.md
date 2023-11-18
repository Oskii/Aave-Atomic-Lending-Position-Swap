
# Atomic Aave Lending Position Swap (Trustless and Cross-Chain)

## Introduction
Welcome to the Atomic Aave Lending Position Swap (AALPS) project! 

This project demonstrates a completely trustless, decentralized, cryptographically secure protocol for cross-chain atomic swaps of Aave lending positions (aTokens). It enables holders of lending positions (aTokens) in Aave to seamlessly exchange aTokens for other aTokens, or any ERC20 token between any chain that supports AaveV3. 

For example, someone can use this project to trustlessly swap their aTokens on Avalanche for USDC on Polygon - or aTokens on Ethereum for aTokens on Avalanche. 

We refer to the mechanism as the Atomic Aave Lending Position Swap (AALPS) - users can trustlessly swap a specified number of aTokens on one chain for a corresponding number of aTokens on another chain. The outcome is full interoperability between any EVM chain for market-making of Aave liquidity positions.

## How does it work?
AALPS leverages a Secure Exchange Protocol (SEP) that relies on one-way hashing of a cryptographic secret and time-constraints on specific actions. Here are the steps for completing an AALPS. It ensures that all parties funds' remain safe throughout the lifecycle of the transaction.

1. Agreement Creation:

- Party A initiates the process by locking funds on their blockchain. This lock includes a cryptographic challenge, whose solution is a secret code, that only they know the solution to initially. If Party B learns this secret within the deadline, they may unlock these funds. 
- The agreement also specifies a deadline by which the transaction must be completed.

2. Agreement Commitment by Party B:

- Party B, upon reviewing the locked assets, engages in the agreement by creating a similar agreement on their blockchain, referencing the cryptographic challenge set by Party A.
- Party B's agreement also includes a deadline, which is set earlier than Party A's deadline, to ensure that Party A has enough time to respond.

3. Asset Locked:

- Both parties' assets are now effectively locked and cannot be accessed by anyone else.
- The assets will only be released when the cryptographic challenge is correctly solved.

4. Challenge Solution and Asset Exchange:

- Party A now reveals the solution to the cryptographic challenge (the secret code) on Party B's blockchain to claim Party B's locked assets.
- By revealing the solution on the blockchain, Party A automatically makes it public, allowing Party B to use the same solution on Party A's blockchain.

5. Completion of the Swap:

- Party B uses the now-revealed solution to claim the assets locked by Party A on Party A’s blockchain.
- This ensures that both parties receive the assets they were swapping, completing the exchange.

6. Failure to Complete:

- If Party A fails to reveal the solution before Party B's deadline, Party B can reclaim their locked assets, as the agreement becomes void.
- Similarly, if Party B does not claim Party A's assets after the solution is revealed and before Party A's deadline, Party A can reclaim their locked assets.


## Features Demonstrated

- Cross-chain atomic swap functionality between Ethereum Sepolia testnet and Polygon Mumbai testnet.
- Secure and trustless cryptographic method, which we call **the Atomic Aave Lending Swap method**.

## Prerequisites
Before you get started, ensure you have the following installed:

- Node.js (version 16.20.0 or higher)
- NPM (Node Package Manager)
- Hardhat (version 2.19.1)
- I am using WSL2 as my terminal

Installation
To set up the Atomic Aave Lending Swap project on your local machine, follow these steps:

1. Ensure you have the prerequisites above

```bash
npm install
```