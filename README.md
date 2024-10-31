Smart Wallet Project
A simplified project for managing tokens between an Externally Owned Account (EOA) and gasless smart wallets. Smart wallets can perform transactions without paying gas, with fees sponsored by a paymaster.

Key Features
Smart Wallet Creation: Create wallets linked to an EOA.
Token Transfer: Move tokens between EOA and smart wallet.
Gasless Transactions: Smart wallets transact without paying gas fees.
Quick Setup Guide
Prerequisites
Node.js and npm/yarn
Hardhat or Truffle for compiling and deploying contracts
MetaMask (or any Web3-compatible wallet)
Access to an Ethereum-compatible test network
Installation Steps
Clone the Repository:

bash
Copy code
git clone https://github.com/yourusername/smart-wallet-project.git
cd smart-wallet-project
Install Dependencies:

bash
Copy code
yarn install
Compile Contracts:

bash
Copy code
npx hardhat compile
Deploy Contracts:

bash
Copy code
npx hardhat run scripts/deploy.js --network yourNetwork
Usage Instructions
Create a Smart Wallet:

From the EOA, call createSmartWallet(address owner) to generate a new smart wallet linked to the owner.
Transfer Tokens:

From EOA to Smart Wallet: Call transferToSmartWallet(walletAddress, amount) with the smart wallet address and token amount.
From Smart Wallet to EOA: Call transferToEOA(amount) from the smart wallet to send tokens back to the EOA.
Gasless Transaction:

Use executeGaslessTransaction(to, amount, data) from the smart wallet to perform transactions without gas fees.
Technical Details
Gas Sponsorship: The system uses a paymaster to cover gas fees for transactions initiated from the smart wallet.
Key Contracts:
SmartWallet.sol: Handles wallet functions and token transfers.
WalletFactory.sol: Manages the creation of new smart wallets
