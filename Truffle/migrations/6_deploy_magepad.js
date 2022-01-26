const MagePad = artifacts.require("MagePad");
const magePadNFTAddress = "0x75088E106a8F8c62195f2b35Cf09FD60513FCABf";

module.exports = function (deployer) {
  deployer.deploy(MagePad, magePadNFTAddress);
};
