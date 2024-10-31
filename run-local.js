// run-local.js
const { handler } = require("./smartwallet");

//test
// const event = {
//   operation: "test",
// };
//Create Smart Wallet

// const event = {
//   operation: "createSmartWallet", // change this to the desired operation
//   //   tokenAddress: "0x...", // replace with actual values
//   amount: 1000,
// };
//0x818007c2282aB8C12EDF705eb5b4b63e3261770d

//send token from EOA to smart wallet

const event = {
  operation: "sendErc20ToSmartWallet", // change this to the desired operation
  //   tokenAddress: "0x...", // replace with actual values
  amount: 10,
  destination: "0x818007c2282aB8C12EDF705eb5b4b63e3261770d",
};

//send token from smart wallet to EOA

// const event = {
//   operation: "sendErc20FromSmartWallet", // change this to the desired operation
//   //   tokenAddress: "0x...", // replace with actual values
//   amount: 1,
//   destination: "0x6A35f74Bc3785a1cb9E729f9a16D2840b2Dc18Ac",
// };

//checkbalance
// const event = {
//   operation: "checkTokenBalance", // change this to the desired
//   address: "0x818007c2282aB8C12EDF705eb5b4b63e3261770d",
//   tokenAddress: "0x2e06D4885449802c3745f0A9FC5681eF4cB5076c",
// };

handler(JSON.stringify(event))
  .then((response) => {
    console.log("Response:", response);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
