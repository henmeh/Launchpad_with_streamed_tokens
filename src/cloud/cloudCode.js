Moralis.Cloud.define("getTokenBalances", async (request) => {    
  const options = {
    chain: "0xa869",
    address: request.params.walletAddress
  }  
  const balances = await Moralis.Web3API.account.getTokenBalances(options);
    return balances;
});

Moralis.Cloud.define("getSuperTokens", async (request) => {
  let tokens = [];
  const query = new Moralis.Query("Superfluidtokens");
  let result = await query.find();
  if(result) {
    for(let i = 0; i < result.length; i++) {
      tokens.push(result[i].get("tokenAddress").toLowerCase());
    }
  }
  return tokens;
});

Moralis.Cloud.define("deleteOfferFromSale", async (request) => {
  const query = new Moralis.Query("NewSale");
  query.equalTo("tokenId", request.params.tokenId);
  query.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  let result = await query.first();
  if(result) {
    await result.destroy();
  }
});

Moralis.Cloud.define("getMyOffers", async (request) => {
  let myOffers = [];
  const web3 = Moralis.web3ByChain("0xa869");
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, request.params.MarketplaceAddress);
  const query = new Moralis.Query("NewOffer");
  query.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  query.equalTo("highestBidder", request.params.walletAddress);
  let result = await query.find();
  if(result) {
    for(let i = 0; i < result.length; i++) {
      const _marketInfo = await contractMarketplace.methods.saleMap(request.params.MagePadNFTAddress, result[i].get("tokenId")).call();
      const myOffer = {
        tokenId: result[i].get("tokenId"), 
        myBid: result[i].get("highestBid"),
        isAccepted: _marketInfo.offerAccepted,
      }
      myOffers.push(myOffer);
    }
  }
  return myOffers;
});

Moralis.Cloud.define("clearAfterBuy", async (request) => {
  const query = new Moralis.Query("NewOffer");
  query.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  query.equalTo("tokenId", request.params.tokenId);
  let result = await query.first()
  if(result) {
    await result.destroy();
  }

  const query1 = new Moralis.Query("NewSale");
  query1.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  query1.equalTo("tokenId", request.params.tokenId);
  let result1 = await query1.first()
  if(result1) {
    await result1.destroy();
  }
});

Moralis.Cloud.define("storePricehistory", async (request) => {
  const query = new Moralis.Query("Pricehistory");
  query.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  query.equalTo("tokenId", request.params.tokenId);
  let result = await query.first();
  //if there is a result, the new price and date has to be appended
  if(result) {
    const newEntry = {
      date: request.params.date,
      price: request.params.price,
    }
    let oldEntries = result.get("pricehistory");
    let newEntries = oldEntries.push(newEntry);
    result.set("pricehistory", newEntries);
    await result.save();
  }
  //if there is no result, a new entry or this nft has to be created
  else {
    let prices = [];
    const price = {
      date: request.params.date,
      price: request.params.price,
    };
    prices.push(price);
    const NewPrice = Moralis.Object.extend("Pricehistory");
    const newPrice = new NewPrice();
    newPrice.set("tokenId", request.params.tokenId);
    newPrice.set("magePadNFTAddress", request.params.MagePadNFTAddress);
    newPrice.set("pricehistory", prices);
    await newPrice.save();
  }
});

Moralis.Cloud.define("getPricehistory", async (request) => {
  let pricehistory = [];
  let plotData = [];
  const query = new Moralis.Query("Pricehistory");
  query.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  query.equalTo("tokenId", request.params.tokenId);
  let result = await query.first();
  if(result) {
    pricehistory = result.get("pricehistory");
  }
  for(let i = 0; i < pricehistory.length; i++) {
    const dateObject = new Date(pricehistory[i].date);
    const point = {
      date: dateObject.toLocaleString("en-US"),
      price: (parseInt(pricehistory[i].price) / 1000000000000000000).toString(),
    }
    plotData.push(point);
  }
  return plotData;
});

Moralis.Cloud.define("placeOffer", async (request) => {
  const web3 = Moralis.web3ByChain("0xa869");
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, request.params.MarketplaceAddress);
  const data = contractMarketplace.methods.makePriceOffer(request.params.tokenId, request.params.price, request.params.walletAddress, request.params.MagePadNFTAddress);
  const txData = data.encodeABI();

  let config;
  config = await Moralis.Config.get({useMasterKey: true});
  const address = config.get("address");
  const gas = await data.estimateGas({from: address});
  const gasPrice = await web3.eth.getGasPrice();
  const txNonce = await web3.eth.getTransactionCount(address);
  config = await Moralis.Config.get({useMasterKey: true});
  const privateKey = config.get("privateKey");

  tx = {
    to: request.params.MarketplaceAddress,
    data: txData,
    gas: gas,
    gasPrice: gasPrice,
    nonce: txNonce,
  };
  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
});

Moralis.Cloud.job("checkMarketplace", async (request) => {
  const MarketplaceAddress = "0xF52e43C2d711a1DC3DBa3981f95cc1ae0846Bff5";
  const MagePadNFTAddress = "0x75088E106a8F8c62195f2b35Cf09FD60513FCABf";

  const web3 = Moralis.web3ByChain("0xa869");
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, MarketplaceAddress);
  let salesToClose = [];
  salesToClose = await contractMarketplace.methods.checkForUpdate(MagePadNFTAddress).call();
  let newSalesToClose = [];
  for (let i = 0; i < salesToClose.length; i++) {
    	salesToClose[i] != 0 && newSalesToClose.push(parseInt(salesToClose[i]));
  }
  
  if(newSalesToClose.length > 0) {
    const data = contractMarketplace.methods.performUpdate(newSalesToClose, MagePadNFTAddress);
    const txData = data.encodeABI();
    let config;
    config = await Moralis.Config.get({useMasterKey: true});
    const address = config.get("address");
    const gas = await data.estimateGas({from: address});
    const gasPrice = await web3.eth.getGasPrice();
    const txNonce = await web3.eth.getTransactionCount(address);
    const privateKey = config.get("privateKey");

    tx = {
      to: MarketplaceAddress,
      data: txData,
      gas: gas,
      gasPrice: gasPrice,
      nonce: txNonce,
    };
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    // delete the offer from the moralis db
    for(let i = 0; i < newSalesToClose.length; i++) {
      const query = new Moralis.Query("NewOffer");
      query.equalTo("magePadNFTAddress", MagePadNFTAddress.toLowerCase());
      query.equalTo("tokenId", newSalesToClose[i].toString());
      let result = await query.first();
      if(result) {
        await result.destroy();
      }
    }
  }
})

Moralis.Cloud.define("acceptFinalOffer", async (request) => {
  const web3 = Moralis.web3ByChain("0xa869");
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, request.params.MarketplaceAddress);
  const data = contractMarketplace.methods.acceptOffer(request.params.tokenId, request.params.MagePadNFTAddress, request.params.walletAddress);
  const txData = data.encodeABI();

  let config;
  config = await Moralis.Config.get({useMasterKey: true});
  const address = config.get("address");
  const gas = await data.estimateGas({from: address});
  const gasPrice = await web3.eth.getGasPrice();
  const txNonce = await web3.eth.getTransactionCount(address);
  const privateKey = config.get("privateKey");

  tx = {
    to: request.params.MarketplaceAddress,
    data: txData,
    gas: gas,
    gasPrice: gasPrice,
    nonce: txNonce,
  };
  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
});

Moralis.Cloud.define("getNFTForSale", async (request) => {
  let nftsForSale = [];
  const web3 = Moralis.web3ByChain("0xa869");
  const contract = new web3.eth.Contract(MagePadNFTABI, request.params.MagePadNFTAddress);
  const contractMarketplace = new web3.eth.Contract(MarketplaceABI, request.params.MarketplaceAddress);
  const query = new Moralis.Query("NewSale");
  query.equalTo("magePadNFTAddress", request.params.MagePadNFTAddress);
  let result = await query.find();
  if(result) {
    for(let i = 0; i < result.length; i++) {
      const nftInfo = await contract.methods.allNFTs(result[i].get("tokenId")).call();
      const _marketInfo = await contractMarketplace.methods.saleMap(request.params.MagePadNFTAddress, result[i].get("tokenId")).call();
      const _alreadyStreamed = await contract.methods.getAlreadyStreamed(result[i].get("tokenId")).call();
      let nftForSale = {
        id: result[i].id,
        tokenId: result[i].get("tokenId"),
        startingBlock: nftInfo.startingBlock,
        endingBlock: nftInfo.endingBlock,
        streamReceiver: nftInfo.streamReceiver,
        streamAmount: nftInfo.streamAmount,
        streamRate: nftInfo.streamRate,
        streamToken: nftInfo.streamToken,
        lockedAmount: nftInfo.lockedAmount,
        securityAmount: nftInfo.securityAmount,
        minter: nftInfo.minter,
        isStopped: nftInfo.isStopped,
        alreadyStreamed: _alreadyStreamed,
        marketInfo: _marketInfo,
      }
      nftsForSale.push(nftForSale);
    }
  }
  return nftsForSale;
});


Moralis.Cloud.define("getMyMageNFTs", async (request) => {
    let myMageNFTs = [];
    const web3 = Moralis.web3ByChain("0xa869");
    const contract = new web3.eth.Contract(MagePadNFTABI, request.params.MagePadNFTAddress);
    const contractMarketplace = new web3.eth.Contract(MarketplaceABI, request.params.MarketplaceAddress);
    const query = new Moralis.Query("AvaxNFTOwners");
    query.equalTo("token_address", request.params.MagePadNFTAddress);
    query.equalTo("owner_of", request.params.walletAddress);
    let result = await query.find();
    if(result) {
        for(let i = 0; i < result.length; i++) {
            const nftInfo = await contract.methods.allNFTs(result[i].get("token_id")).call();
            const _marketInfo = await contractMarketplace.methods.saleMap(request.params.MagePadNFTAddress, result[i].get("token_id")).call();
            const _alreadyStreamed = await contract.methods.getAlreadyStreamed(result[i].get("token_id")).call();
            let myMageNFT = {
                id: result[i].id,
                tokenId: result[i].get("token_id"),
                name: result[i].get("name"),
                symbol: result[i].get("symbol"),
                startingBlock: nftInfo.startingBlock,
                endingBlock: nftInfo.endingBlock,
                streamReceiver: nftInfo.streamReceiver,
                streamAmount: nftInfo.streamAmount,
                streamRate: nftInfo.streamRate,
                streamToken: nftInfo.streamToken,
                lockedAmount: nftInfo.stakedAmount,
                securityAmount: nftInfo.securityAmount,
                minter: nftInfo.minter,
                isStopped: nftInfo.isStopped,
                alreadyStreamed: _alreadyStreamed,
                marketInfo: _marketInfo,
            }
            myMageNFTs.push(myMageNFT);
        }
    }
    // search for pending NFTs balances
    const queryPending = new Moralis.Query("AvaxNFTOwnersPending");
    queryPending.equalTo("token_address", request.params.MagePadNFTAddress);
    queryPending.equalTo("owner_of", request.params.walletAddress);
    let resultPending = await queryPending.find();
    if(resultPending) {
      for(let i = 0; i < resultPending.length; i++) {
        const nftInfo = await contract.methods.allNFTs(resultPending[i].get("token_id")).call();
        const _marketInfo = await contractMarketplace.methods.saleMap(request.params.MagePadNFTAddress, resultPending[i].get("token_id")).call();
        const _alreadyStreamed = await contract.methods.getAlreadyStreamed(resultPending[i].get("token_id")).call();
        let myMageNFT = {
            id: resultPending[i].id,
            tokenId: resultPending[i].get("token_id"),
            name: resultPending[i].get("name"),
            symbol: resultPending[i].get("symbol"),
            startingBlock: nftInfo.startingBlock,
            endingBlock: nftInfo.endingBlock,
            streamReceiver: nftInfo.streamReceiver,
            streamAmount: nftInfo.streamAmount,
            streamRate: nftInfo.streamRate,
            streamToken: nftInfo.streamToken,
            lockedAmount: nftInfo.lockedAmount,
            securityAmount: nftInfo.securityAmount,
            minter: nftInfo.minter,
            isStopped: nftInfo.isStopped,
            alreadyStreamed: _alreadyStreamed,
            marketInfo: _marketInfo,
        }
        myMageNFTs.push(myMageNFT);
      }
    }
    return myMageNFTs;
})

const MagePadNFTABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_mageTokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_marketplaceAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "approved",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allNFTs",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "startingBlockTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endingBlockTime",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "streamReceiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "streamAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "streamRate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "streamToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "stakedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "securityAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "minter",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isStopped",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "originalStreamAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getApproved",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "_data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "checkForUpdate",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "_flowsToStop",
        "type": "uint256[]"
      }
    ],
    "name": "performUpdate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "withdrawStakedAmount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_nftOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_streamAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_streamRate",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_streamToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_stakedAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_projectOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_magePadAddress",
        "type": "address"
      }
    ],
    "name": "mint",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "stopFlow",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "putForSale",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "removeFromSale",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "getAlreadyStreamed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const MarketplaceABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "NewOffer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "NewSale",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "OfferAccepted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "RemoveSale",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "SoldNFT",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "saleMap",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "offerAccepted",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "biddingBlockTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tokensWithBids",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "checkForUpdate",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "_bidsToStop",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "performUpdate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "setSale",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "removeSale",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "buyNFT",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      }
    ],
    "name": "makePriceOffer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "magePadNFTAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "acceptOffer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];