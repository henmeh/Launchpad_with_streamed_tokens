require('dotenv').config();

const MagePadNFT = require("../build/contracts/MagePadNFT.json");
const MagePadNFTABI = MagePadNFT.abi;
const MageNFTADDRESS = "0x0750A0AC2Ad402732aedB6aAF7019c9D0038F9ad";
//const TokenFarmAddress = "0x7B3D7Fc75A711C819d56d55C53f14704Bf79Af40";

const ISuperToken = require("../build/contracts/ISuperToken.json");
const ISuperTokenABI = ISuperToken.abi;

const Marketplace = require("../build/contracts/Marketplace2.json");
const MarketplaceABI = Marketplace.abi;
const MarketplaceADDRESS = "0xF52e43C2d711a1DC3DBa3981f95cc1ae0846Bff5";

//For Kovan
//const SuperTokenADDRESS = "0xe3CB950Cb164a31C66e32c320A800D477019DCFF";
//For Mumbai
//const SuperTokenADDRESS = "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f";
//For Avalanche
const SuperTokenADDRESS = "0x296E9c01f80D408741f6e15d62013DDbe1041f1D";

const Web3 = require("web3");
const web3 = new Web3(process.env.SpeedyNodeFuji);

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY_1);
const { address: buyer } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY_2);

const sendingOptions = { from: admin, gasLimit: "0x2dc6c0" };
const contractMagePad = new web3.eth.Contract(MagePadNFTABI, MageNFTADDRESS);
const owner = "0xe1f4f6E3ff3eFa235eaFf10aFf34f6a83Dd9357B";
const newOwner = "0x1D5F1298061503ef8E2A7b578ee8ae29D81c287A";

const interact = async function () {
  try {
    const _flowAmount = web3.utils.toWei("0.08", "ether");
    const _flowRate = Math.round(_flowAmount / (5 * 60 * 60)).toString();
    const _stakeAmount = web3.utils.toWei("0.02", "ether");
    const _securityAmount = (_flowRate * (60 * 60)).toString();
    const _totalAmount = parseInt(_securityAmount) + parseInt(_flowAmount) + parseInt(_stakeAmount);

    const superTokenContract = new web3.eth.Contract(
      ISuperTokenABI,
      SuperTokenADDRESS
    );
    const approve = await superTokenContract.methods.approve(MageNFTADDRESS, _totalAmount.toString()).send(sendingOptions);
    //console.log(approve);
    const mint = await contractMagePad.methods.mint(owner, _flowAmount, _flowRate, SuperTokenADDRESS, _stakeAmount, _securityAmount).send(sendingOptions);
    await getBalance();
    //console.log(mint);
  } catch (error) {
    console.log(error);
  }
};

const saleNFT = async function () {
  //const approve = await contractMagePad.methods.setApprovalForAll(MarketplaceADDRESS, true).send(sendingOptions);
  //console.log(approve);
  const sale = await contractMagePad.methods.putForSale("1", MageNFTADDRESS).send(sendingOptions);
  console.log(sale);
}

const removeFromSaleNFT = async function () {
  //const approve = await contractMagePad.methods.setApprovalForAll(MarketplaceADDRESS, true).send(sendingOptions);
  //console.log(approve);
  const remove = await contractMagePad.methods.removeFromSale("1").send(sendingOptions);
  console.log(remove);
}

const buyNFT = async function () {
  const buyerOptions = {from: buyer, value: "1000000000000000000", gasLimit: "0x2dc6c0"}
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceADDRESS);
  const buy = await contractMarketplace.methods.buyNFT("1", MageNFTADDRESS).send(buyerOptions);
  console.log(buy);
}

const makeOffer = async function () {
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceADDRESS);
  const offer = await contractMarketplace.methods.makePriceOffer("1", "1000000000000000000", newOwner, MageNFTADDRESS).send(sendingOptions);
  console.log(offer);
}

const acceptNewOffer = async function () {
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceADDRESS);
  const accept = await contractMarketplace.methods.acceptOffer("1", MageNFTADDRESS, owner).send(sendingOptions);
  console.log(accept);
}

const getSales = async function () {
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceADDRESS);
  const sale = await contractMarketplace.methods.saleMap(MageNFTADDRESS, "1").call();
  console.log(sale);   
}

const checkingUpdateMarketplace = async function () {
  setInterval(async function () {
    await getSales();
    const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceADDRESS);
    let salesToClose = [];
    salesToClose = await contractMarketplace.methods.checkForUpdate(MageNFTADDRESS).call();
    console.log(salesToClose);
    let newSalesToClose = [];
    for (let i = 0; i < salesToClose.length; i++) {
      salesToClose[i] != 0 && newSalesToClose.push(parseInt(salesToClose[i]));
    }
    console.log(newSalesToClose);
    if(newSalesToClose.length > 0) {
      await contractMarketplace.methods.performUpdate(newSalesToClose, MageNFTADDRESS).send(sendingOptions);
    } 
  }, 5000);
}

const getMarketInfo = async function () {
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceADDRESS);
  const info = await contractMarketplace.methods.saleMap(MageNFTADDRESS, "1").call();
  console.log(info);
}

const transferNFT = async function () {
  const transfer = await contractMagePad.methods
    .safeTransferFrom(owner, newOwner, "1")
    .send(sendingOptions);
  console.log(transfer);
};

const beforeDeleting = async function () {
  const stopFlow = await contractMagePad.methods
    .stopFlow("1")
    .send(sendingOptions);
  console.log(stopFlow);
  const withdrawFunds = await contractMagePad.methods
    .withdraw("1")
    .send(sendingOptions);
  console.log(withdrawFunds);
};

const getBalance = async function () {
  const superTokenContract = new web3.eth.Contract(
    ISuperTokenABI,
    SuperTokenADDRESS
  );
  const balanceMageNFT = await superTokenContract.methods
    .balanceOf(MageNFTADDRESS)
    .call();
  console.log(balanceMageNFT);
};

//die zentralisierte variante funktioniert schon mal
const checkUpdate = async function () {
  //web3.eth.subscribe("newBlockHeaders", async function (error, result) {
  //  return;})
  //  .on("data", async function (blockHeader) {
  //    })
  setInterval(async function () {
    //await getBalance();
    //await getStreamedAmount();
    //await getNFTInfos();
    const flowsToStop = await contractMagePad.methods.checkForUpdate().call();
    console.log(flowsToStop);
    let newFlowsToStop = [];
    for (let i = 0; i < flowsToStop.length; i++) {
      flowsToStop[i] != 0 && newFlowsToStop.push(parseInt(flowsToStop[i]));
    }
    console.log(newFlowsToStop);
    if(newFlowsToStop.length > 0) {
      await contractMagePad.methods.performUpdate(newFlowsToStop).send(sendingOptions);
    }    
  }, 5000);
};

const getNFTInfos = async function () {
  const info = await contractMagePad.methods.allNFTs("1").call();
  console.log(info);
}

const getStreamedAmount = async function() {
  const amount = await contractMagePad.methods.getAlreadyStreamed("1").call();
  console.log(amount);
}

const testAction = async function () {
  await interact();
  await saleNFT();
  await makeOffer();
}

//getNFTInfos();
//getMarketInfo();
//interact();
//saleNFT();
//makeOffer();
//acceptNewOffer();
//removeFromSaleNFT();
//buyNFT();
//transferNFT();
beforeDeleting();
//getBalance();
//testAction();
//checkUpdate();
//checkingUpdateMarketplace();
//getStreamedAmount();
//getSales();