const MagePadNFT = artifacts.require("MagePadNFT");
const mageTokenAddress = "0xb3850712Fd66FE4709f801E2fbF9a3Fc6AE728fE";
const marketPlaceAddress = "0xF52e43C2d711a1DC3DBa3981f95cc1ae0846Bff5";

module.exports = function (deployer) {
  deployer.deploy(MagePadNFT, mageTokenAddress, marketPlaceAddress);
};
