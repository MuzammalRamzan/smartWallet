// lambda-handler.js
require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");
const { Web3 } = require("web3");
const BigNumber = require("bignumber.js"); // Correct way to import BigNumber
const {
  createKernelAccountClient,
  createKernelAccount,
  createZeroDevPaymasterClient,
} = require("@zerodev/sdk");
const { ENTRYPOINT_ADDRESS_V07, bundlerActions } = require("permissionless");
const { privateKeyToAccount } = require("viem/accounts");
const { createPublicClient, http } = require("viem");
const { signerToEcdsaValidator } = require("@zerodev/ecdsa-validator");
const { KERNEL_V3_1 } = require("@zerodev/sdk/constants");

const config = require("./config.js");
const ERC20_ABI = require("./abis/Erc20.js");
const { sepolia } = require("viem/chains");

const web3 = new Web3(new Web3.providers.HttpProvider(config.nodeRpcUrl));
const account = privateKeyToAccount("0x" + config.accountPrivateKey);
var newaccount = "";
const entryPoint = ENTRYPOINT_ADDRESS_V07;
const BUNDLER_RPC = `https://rpc.zerodev.app/api/v2/bundler/${config.zeroDevProjectId}`;
const PAYMASTER_RPC = `https://rpc.zerodev.app/api/v2/paymaster/${config.zeroDevProjectId}`;

async function getBundlerClient(kernelClient) {
  try {
    const bundlerClient = kernelClient.extend(
      bundlerActions(ENTRYPOINT_ADDRESS_V07)
    );
    return bundlerClient;
  } catch (error) {
    console.error("Error creating bundler client:", error);
    return null;
  }
}

async function getKernelClient() {
  const chain = sepolia;
  const signer = privateKeyToAccount("0x" + config.accountPrivateKey);
  const publicClient = createPublicClient({ transport: http(BUNDLER_RPC) });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const account = await createKernelAccount(publicClient, {
    // index: Math.floor(Math.random() * 100) + 1,
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const kernelAccountClient = createKernelAccountClient({
    account,
    chain,
    entryPoint,
    bundlerTransport: http(BUNDLER_RPC),
    middleware: {
      sponsorUserOperation: async ({ userOperation }) => {
        const paymasterClient = createZeroDevPaymasterClient({
          chain,
          entryPoint,
          transport: http(PAYMASTER_RPC),
        });
        return paymasterClient.sponsorUserOperation({
          userOperation,
          entryPoint,
        });
      },
    },
  });

  console.log("The Account:", kernelAccountClient.account.address);
  newaccount = kernelAccountClient.account.address;
  return kernelAccountClient;
}

async function createSmartWallet() {
  try {
    const kernelClient = await getKernelClient();
    console.log(kernelClient);
  } catch (error) {
    console.error("Error creating kernel account client:", error);
  }
}

async function sendEIP1559Transaction(
  account,
  nonce,
  to,
  data,
  gasPrice,
  gasLimit,
  value = "0"
) {
  console.log("Preparing tx.");
  console.log("GasPrice:", gasPrice);
  console.log("GasLimit:", gasLimit);
  console.log("MaxPriorityFeePerGas:", config.maxPriorityFeePerGas);
  console.log(
    "MaxFeePerGas:",
    parseInt(gasPrice) + config.maxPriorityFeePerGas
  );
  console.log("Value:", value);

  const totalGasCost = new BigNumber(gasPrice)
    .plus(config.maxPriorityFeePerGas)
    .multipliedBy(gasLimit);
  const balance = await web3.eth.getBalance(account.address);

  if (new BigNumber(balance).isLessThan(totalGasCost)) {
    console.log(
      `Account ${account.address} does not have enough gas to perform the transaction.`
    );
    return;
  }

  const txData = {
    nonce: nonce,
    gasLimit: web3.utils.toHex(gasLimit),
    to: to,
    data: web3.utils.isHex(data) ? data : web3.utils.toHex(data),
    maxPriorityFeePerGas: web3.utils.toHex(config.maxPriorityFeePerGas),
    maxFeePerGas: web3.utils.toHex(
      parseInt(gasPrice) + config.maxPriorityFeePerGas
    ),
    type: 2,
    chainId: config.chainID,
  };

  const signedTx = await web3.eth.accounts.signTransaction(
    txData,
    config.accountPrivateKey
  );
  await web3.eth
    .sendSignedTransaction(signedTx.rawTransaction)
    .on("transactionHash", function (hash) {
      console.log("Tx hash:", hash);
      console.log("Tx mining ....");
    })
    .on("error", function (error) {
      console.log("Tx not succeed.", error);
    })
    .on("receipt", (receipt) => {
      console.log("TX mined in the block:", receipt.blockNumber);
      if (receipt.status == true) {
        console.log("Tx mined.");
      }
    });
}

async function calculateAndDeductTax(amount, destination) {
  let taxRate = config.defaultTaxRate;
  if (destination === config.treasuryAddress) {
    taxRate = config.taxRateForEOA;
  }
  const taxAmount = amount * taxRate;
  return taxAmount;
}

async function sendErc20ToSmartWallet(
  tokenAddress,
  amount,
  smartWalletAddress
) {
  console.log("Sending ERC-20 tokens to smart wallet...");
  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  const tokenDecimals = await tokenContract.methods.decimals().call();
  const taxAmount = await calculateAndDeductTax(amount, smartWalletAddress);
  const amountToSend = web3.utils.toWei(amount - taxAmount, "ether");

  const data = tokenContract.methods
    .transfer(smartWalletAddress, amountToSend)
    .encodeABI();

  const nonce = await web3.eth.getTransactionCount(account.address, "latest");
  await sendEIP1559Transaction(
    account,
    nonce,
    tokenAddress,
    data,
    config.maxFeePerGas,
    config.gasLimit
  );
}
async function checkBalance(address, tokenAddress) {
  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  const balance = await tokenContract.methods.balanceOf(address).call();
  return web3.utils.fromWei(balance, "ether");
}
async function sendErc20FromSmartWallet(tokenAddress, amount, destination) {
  console.log("Sending ERC-20 tokens from smart wallet...");
  const kernelClient = await getKernelClient();
  if (!kernelClient) {
    console.error("Failed to initialize the kernel client.");
    return;
  }
  const bundlerClient = await getBundlerClient(kernelClient);
  if (!bundlerClient) {
    console.log("Failed to initialize the bundler client.");
    return;
  }

  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  const tokenDecimals = await tokenContract.methods.decimals().call();
  const taxAmount = await calculateAndDeductTax(amount, destination);
  const amountToSend = web3.utils.toWei(amount - taxAmount, "ether");
  const data = tokenContract.methods
    .transfer(destination, amountToSend)
    .encodeABI();

  const userOpHash = await kernelClient.sendUserOperation({
    userOperation: {
      callData: await kernelClient.account.encodeCallData({
        to: tokenAddress,
        value: BigInt(0),
        data: data,
      }),
    },
  });

  console.log("User operation hash:", userOpHash);

  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  console.log("Transaction receipt:", receipt);

  if (receipt.success) {
    console.log(
      "Transaction successful and mined in block:",
      receipt.blockNumber
    );
  } else {
    console.log("Transaction failed.");
  }
}

async function batchAndReconcileTransactions(from, to, amount, tokenAddress) {
  console.log("Batching and reconciling SW2SW transactions...");

  const transactions = [from, to, amount, tokenAddress];

  const groupedTransactions = transactions.reduce((acc, tx) => {
    (acc[tx.from] = acc[tx.from] || []).push(tx);
    return acc;
  }, {});

  for (const [from, txs] of Object.entries(groupedTransactions)) {
    const kernelClient = await getKernelClient();
    if (!kernelClient) {
      console.error("Failed to initialize the kernel client.");
      return;
    }
    const bundlerClient = await getBundlerClient(kernelClient);
    if (!bundlerClient) {
      console.log("Failed to initialize the bundler client.");
      return;
    }

    for (const tx of txs) {
      const tokenContract = new web3.eth.Contract(ERC20_ABI, tx.tokenAddress);
      const amountToSend = ethers.utils.parseUnits(
        tx.amount,
        await tokenContract.methods.decimals().call()
      );
      const data = tokenContract.methods
        .transfer(tx.to, amountToSend)
        .encodeABI();

      const userOpHash = await kernelClient.sendUserOperation({
        userOperation: {
          callData: await kernelClient.account.encodeCallData({
            to: tx.tokenAddress,
            value: BigInt(0),
            data: data,
          }),
        },
      });

      console.log("User operation hash:", userOpHash);

      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      console.log("Transaction receipt:", receipt);

      if (receipt.success) {
        console.log(
          "Transaction successful and mined in block:",
          receipt.blockNumber
        );
      } else {
        console.log("Transaction failed.");
      }
    }
  }
}

async function dailyBalanceReport() {
  console.log("Generating daily balance report...");

  const balances = [];
  for (const wallet of config.treasury.wallets) {
    const balance = await web3.eth.getBalance(wallet.address);
    const formattedBalance = ethers.utils.formatUnits(balance, "ether");
    balances.push({ address: wallet.address, balance: formattedBalance });
  }

  const report = {
    date: new Date().toISOString().split("T")[0],
    balances: balances,
  };

  fs.writeFileSync(
    "daily_balance_report.json",
    JSON.stringify(report, null, 2)
  );
  console.log("Daily balance report generated:", report);
}

// Lambda handlers
exports.handler = async (event) => {
  try {
    const {
      operation,
      tokenAddress = config.communityTokenAddrss,
      amount = 0,
      destination = "0x0000000000000000000000000000000000000000",
      address = "0x0000000000000000000000000000000000000000",
    } = typeof event === "string" ? JSON.parse(event) : event;
    console.log("operation", operation);

    switch (operation) {
      case "test":
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Smart wallet api gateway deployed.",
          }),
        };
      case "checkTokenBalance":
        const balance = await checkBalance(address, tokenAddress);
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: `token Balance of ${address} is ${balance}`,
          }),
        };
      case "createSmartWallet":
        await createSmartWallet();
        return {
          statusCode: 200,
          body: JSON.stringify({
            message:
              "Smart wallet created with address: " +
              newaccount +
              " from the private key of address: " +
              account.address,
          }),
        };
      case "sendErc20ToSmartWallet":
        await sendErc20ToSmartWallet(tokenAddress, amount, destination);
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "ERC-20 tokens sent to smart wallet",
          }),
        };
      case "sendErc20FromSmartWallet":
        await sendErc20FromSmartWallet(tokenAddress, amount, destination);
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "ERC-20 tokens sent from smart wallet",
          }),
        };
      case "batchAndReconcileTransactions":
        await batchAndReconcileTransactions();
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Transactions batched and reconciled",
          }),
        };
      case "dailyBalanceReport":
        await dailyBalanceReport();
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Daily balance report generated" }),
        };
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid operation" }),
        };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    };
  }
};
