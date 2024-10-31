# Smart Wallet Project

## Overview
This project allows for the creation of smart wallets from an Externally Owned Account (EOA). Users can transfer tokens between the EOA and smart wallets, with the added benefit that transactions from smart wallets do not require the user to pay gas fees.

## Key Features
- **Smart Wallet Creation:** Easily create smart wallets linked to an EOA.
- **Token Transfer:** Transfer tokens seamlessly between EOA and smart wallets.
- **Gasless Transactions:** Smart wallets can perform transactions without incurring gas fees, sponsored by a paymaster.

## Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** and **npm** or **yarn**
- **Hardhat** or **Truffle** for deploying contracts
- **MetaMask** (or another Web3-compatible wallet)
- Access to an **Ethereum-compatible test network** (e.g., Rinkeby, Goerli)

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/smart-wallet-project.git
   cd smart-wallet-project
2. **Install Dependencies:**
yarn install

3:  How to run:
 ```bash
npx hardhat compile
=npx hardhat run scripts/deploy.js --network yourNetwork


