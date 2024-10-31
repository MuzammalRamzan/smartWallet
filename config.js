require("dotenv").config();

module.exports = {
  chainID: 11_155_111,
  nodeRpcUrl: process.env.RPC_URL,
  zeroDevProjectId: process.env.ZERO_DEV_PROJECT_ID,
  accountPrivateKey: process.env.PRIVATE_KEY,
  maxPriorityFeePerGas: 100000000,
  maxFeePerGas: 1500744276,
  gasLimit: 200000,
  defaultTaxRate: 0.01,
  taxRateForEOA: 0.05,
  communityTokenAddrss: process.env.TOKEN_ADDRESS,
  treasuryAddress: "",
};
