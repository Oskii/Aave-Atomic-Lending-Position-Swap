# Atomic Aave Lending Position Swap (Trustless and Cross-Chain)

## Introduction

Welcome to the Atomic Aave Lending Position Swap (AALPS) project!

This project demonstrates a completely trustless, decentralized, cryptographically secure protocol for cross-chain atomic swaps of Aave lending positions (aTokens). It enables holders of lending positions (aTokens) in Aave to securely exchange aTokens for other aTokens, or any ERC20 token between any chain that supports AaveV3.

For example, someone can use an AALPS to trustlessly swap their aTokens on Avalanche for USDC on Polygon - or aTokens on Ethereum for aTokens on Avalanche.

We refer to the mechanism as the Atomic Aave Lending Position Swap (AALPS). The outcome is full interoperability between any EVM chains for trading Aave liquidity positions. ✨👻

## Prerequisites

Before you get started, ensure you have the following installed:

- Node.js (version 16.20.0 or higher)
- NPM (Node Package Manager)
- Hardhat (version 2.19.1)
- I used WSL2 as my terminal

## Installation

To set up the Atomic Aave Lending Swap project on your local machine, follow these steps:

1. Ensure you have the prerequisites above

```bash
npm install
```

## Simulate an AALPS locally via hardhat with Mock aTokens

AALPS works in the exact same way on 1 chain or in a multi-chain setting. It does not need to know which chains it is operating on. In this local simulation, two parties swap mock aDai and aWBTC using AALPS.

To simulate the swap locally:

Open a second terminal and spin up a hardhat node

```bash
npx hardhat node
```

Then in the first terminal type

```bash
npx hardhat run scripts/simulate.ts
```

## Tests Passing

Run the tests by typing the following from the root directory
```bash
npx hardhat test
```

![image](https://github.com/Oskii/aave-cross-chain-lending-position-swaps/assets/30426408/e9045dbe-58f2-4e6c-b88b-9031907263f3)


### Example Use Case

- Alice has an AaveV3 lending position of 50 DAI on Ethereum, and so holds 50 aDAI.
- Bob has an AaveV3 lending position of 0.001 WBTC on Arbitrum, and so holds aWBTC.

Both Alice and Bob agree that they would like to exchange positions with each other, and use AALPS to trustlessly and securely exchange their aTokens. Even though their positions are cross-chain and using different assets, Alice and Bob are able to exchange their positions trustlessly and securely.

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

### Flow of an AALPS between two parties

![image](https://github.com/Oskii/aave-cross-chain-lending-position-swaps/assets/30426408/cd835243-1552-4873-8a1e-aa950cb94d2a)

## Live & Verified Contracts

### Polygon Mumbai 

https://mumbai.polygonscan.com/address/0x0Ac42b02BFE612454Ea6706Ad910e4d8AF79076e#code

### Ethereum Sepolia

https://sepolia.etherscan.io/address/0x537D205A880ea1d927Acb2cb88d16B6D017bE46f#code

## Cross-chain swap using AALPS between Polygon Mumbai and Ethereum Sepolia

This project has been used to successfully transfer aWMatic and aWETH positions between Polygon Mumbai and Ethereum Sepolia respectively. See the following transactions on the respective blockchains for a detailed history

1. Alice locks up 0.001 aWMATIC on the Mumbai testnet
https://mumbai.polygonscan.com/tx/0x65dc595303973ff8e8a189b2319a23167ae6457c5ad4d982f97344e0b4431901

2. Bob locks up 0.001 aWETH on the Sepolia testnet
https://sepolia.etherscan.io/tx/0x1b245dc9c3ef0738aff9b82572320b118fe5f6930076aa8ef8b24ac203153997

3. Alice withdraws the aWMATIC exposing the secret _key value
https://mumbai.polygonscan.com/tx/0xfc88c84a449bdab4071e10fc117c181ae7d963c225ac6f68b42cd83c22e75544

| #  | Name            | Type    | Data                                                         |
|----|-----------------|---------|--------------------------------------------------------------|
| 0  | _aalpsInstanceId | bytes32 | 0xc1099f01b38d76e06fb085f84ea3a479ab7cb7e6977c2df9c9c38970f61b7543 |
| 1  | _key            | bytes32 | 0xc69f07ec6be26b07ff53788ee2ddb717b5ac87d77b8d865a03e7909513fbdf27 |

4. Bob captures the exposed _key value and uses it to withdraw the aWETH
https://sepolia.etherscan.io/tx/0xdc8e27d3a43991fa7b80a20c338a6bb05ed64b6a8430eb6b0d8a1d8db29a6d35

| #  | Name            | Type    | Data                                                         |
|----|-----------------|---------|--------------------------------------------------------------|
| 0  | _aalpsInstanceId | bytes32 | 0x282690b71e5c914d8964f239a5d9b9d3bb73ada523ae0eb9be5683ec1f01ea64 |
| 1  | _key            | bytes32 | 0xc69f07ec6be26b07ff53788ee2ddb717b5ac87d77b8d865a03e7909513fbdf27 |

## Cross-chain swap using AALPS between Arbitrum Goerli and Ethereum Sepolia

1. Alice locks up 0.0001 aARbAWTH on Arbitrum Goerli
https://goerli.arbiscan.io/tx/0xe74420df5d5b8fb6a4b287170e116058e212dcef2d763b4abc92c6f12a05271b

2. Bob locks up 0.0001 aWETH on the Sepolia testnet
https://sepolia.etherscan.io/tx/0xb8e8b27f318c0f0660ca34f6aec075c68a7643c462545d93a85dbb3051702460

3. Alice withdraws aWETH on the Sepolia testnet
https://sepolia.etherscan.io/tx/0x70eea970f048b1d4ea47c86dd9b27ba12ce499965a39f0019a1de87b12c14144

4. Bob withdraws aArbWETH on Arbitrum Goerli
https://goerli.arbiscan.io/tx/0x921ece8e324bd949217700ca58e1d3d9b7ccd2672dc4d6fca7ddeb919289d4e1

The following is the logs detailing the individual steps of the entire swap
```
------------------------------------------------------
👻 Checking balances of participants
------------------------------------------------------
[arbitrumGoerli]: Balance of Alice (0xDf7827462B486c37e29A4b319c2B432413a14c39) is 0.01 aWrappedETH
[arbitrumGoerli]: Balance of Bob (0x4f74f405E4b3527224ecAA517C49CeC95376E81B) is 0.01 aWrappedETH
[sepolia]: Balance of Alice (0xDf7827462B486c37e29A4b319c2B432413a14c39) is 0.1 aWrappedETH
[sepolia]: Balance of Bob (0x4f74f405E4b3527224ecAA517C49CeC95376E81B) is 0.05 aWrappedETH
------------------------------------------------------
👻 Starting cross-chain swap of aTokens! [sepolia aWETH <---> arbitrum aWETH]
------------------------------------------------------
[arbitrum goerli]: Alice created secret bytes32 0xc69f07ec6be26b07ff53788ee2ddb717b5ac87d77b8d865a03e7909513fbdf27
[arbitrum goerli]: Alice created secret hash 0x665590a4932d1f62ff520bbcbb8d9145b627ad8c2ab116ec1c0c75782d94d543
[arbitrum goerli]: Approval Transaction hash: 0x0452ee3beba0f359195f3175ffc3cda3e1706b8db77a5a1161276d7d97944fba
[arbitrum goerli]: Transaction was mined in block number: 55902432
[arbitrum goerli]: Alice created a new AALPS proposal on Arbitrum Goerli. Transaction hash:  0xe74420df5d5b8fb6a4b287170e116058e212dcef2d763b4abc92c6f12a05271b
[sepolia]: Bob approved tokens
[sepolia]: Bob created a new AALPS proposal on Sepolia. Transaction hash:  0xb8e8b27f318c0f0660ca34f6aec075c68a7643c462545d93a85dbb3051702460
[sepolia]: Got Bob's proposalId 0xeff4ef8ad20a880d6c391f912a83db48e60c49e230fc8f52737e9feb140a71c1
[sepolia]: Alice withdrew Bob's funds on Sepolia. Transaction hash:  0x70eea970f048b1d4ea47c86dd9b27ba12ce499965a39f0019a1de87b12c14144
[sepolia]: Got the AALPSInstance from proposalId 0xeff4ef8ad20a880d6c391f912a83db48e60c49e230fc8f52737e9feb140a71c1 to get the exposed secret
[sepolia]: The publicly available secret is 0xc69f07ec6be26b07ff53788ee2ddb717b5ac87d77b8d865a03e7909513fbdf27
[arbitrum goerli]: Bob withdrew Alice's funds on Arbitrum Goerli. Transaction hash:  0x921ece8e324bd949217700ca58e1d3d9b7ccd2672dc4d6fca7ddeb919289d4e1
------------------------------------------------------
👻 Aave Atomic Liquidity Position Swap Complete!
👻 Checking balances of participants
------------------------------------------------------
[arbitrumGoerli]: Balance of Alice (0xDf7827462B486c37e29A4b319c2B432413a14c39) is 0.0099 aWrappedETH
[arbitrumGoerli]: Balance of Bob (0x4f74f405E4b3527224ecAA517C49CeC95376E81B) is 0.0101 aWrappedETH
[sepolia]: Balance of Alice (0xDf7827462B486c37e29A4b319c2B432413a14c39) is 0.100100000000000001 aWrappedETH
[sepolia]: Balance of Bob (0x4f74f405E4b3527224ecAA517C49CeC95376E81B) is 0.0499 aWrappedETH
```
