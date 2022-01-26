import React, { useState, useEffect } from "react";
import { useMoralis, useMoralisCloudFunction } from "react-moralis";
import { Card, Image, Button, InputNumber, Spin } from "antd";
import { Moralis } from "moralis";
import { MagePadNFTAddress, MarketplaceAddress } from "../../helpers/contractABI";
import { getEllipsisTxt, tokenValue } from "../../helpers/formatters";
import moneyFlow from "../../images/moneyFlow.jpg";
import { Line } from "@ant-design/charts";
var QRCode = require('qrcode.react');

Moralis.start({
  serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
  appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
});

function NFTForSale({ nft, index }) {
  const tokenId = nft.tokenId;
  const { Moralis, user } = useMoralis();
  const [alreadyStreamed, setAlreadyStreamed] = useState(parseInt(nft.alreadyStreamed));
  const [leftToStream, setLeftToStream] = useState(nft.streamAmount);
  const [amount, setAmount] = useState(0);
  const [showDiagramm, setShowDiagramm] = useState(false);
  const _walletAddress = user ? user.attributes.ethAddress : null;
  const { data, error, isLoading } = useMoralisCloudFunction(
    "getPricehistory",
    { MagePadNFTAddress, tokenId },
    [],
    { live: true }
  );

  let config;
  if(data) {
    config = {
      data: data,
      padding: 'auto',
      xField: 'date',
      yField: 'price',
      color: "orange",
    };  
  }; 
 
  async function makeOffer() {
    const web3 = await Moralis.enableWeb3();
    const params = {
          tokenId: nft.tokenId,
          price: web3.utils.toWei(amount.toString(), "ether").toString(),
          walletAddress: _walletAddress,
          MagePadNFTAddress: MagePadNFTAddress,
          MarketplaceAddress: MarketplaceAddress,
      }
      await Moralis.Cloud.run("placeOffer", params);
      
      const NewOffer = Moralis.Object.extend("NewOffer");
      const newOffer = new NewOffer();

      newOffer.set("tokenId", nft.tokenId);
      newOffer.set("magePadNFTAddress", MagePadNFTAddress);
      newOffer.set("highestBidder", _walletAddress);
      newOffer.set("highestBid", web3.utils.toWei(amount.toString(), "ether").toString());

      await newOffer.save();
  }

  return (
    <Card
      hoverable
      bordered={false}
      style={{
        //width: 380,
        backgroundColor: "rgba(50,50,50,0.6)",
        padding: "10px",
        boxshadow: "20px 20px",
        borderRadius: "30px",
        color: "white",
      }}
      cover={
        <div style={{display: "flex", flexDirection:"column"}}>
          <Button onClick={() => setShowDiagramm(!showDiagramm)} style={{color: "orange", backgroundColor: "blue", borderRadius: "15px", border: "0px"}}>{showDiagramm ? "Show QR Code" : "Show Pricehistory"}</Button>
          {showDiagramm === false ?
          <div style={{display: "flex", flexDirection:"column", alignItems: "center", justifyContent: "center", height: "300px"}}>
          <QRCode value={nft} size={250}/>
        </div>
          :
        <div style={{ height: "300px", borderRadius: "150px" }}>
        {data === null ? <Spin /> : <Line {...config} />}
        </div>
        }
        </div>
      }
      //key={nft.id}
    >
      <h3 style={{ color: "orange" }}>{"MagePadNFT" + " " + nft.tokenId} </h3>
      <p>Already streamed Token: {tokenValue(alreadyStreamed, 18).toFixed(6)}</p>
      <p>Streamrate per second: {tokenValue(nft.streamRate, 18).toFixed(6)} </p>
      <p>
        Tokens left for Stream: {" "} 
        {nft.streamAmount == 0
          ? tokenValue(nft.streamAmount, 18).toFixed(6)
          : tokenValue(leftToStream, 18).toFixed(6)}
      </p>
      <p>Streamed Tokenaddress: {getEllipsisTxt(nft.streamToken)} </p>
      <p>Stream is stopped: {nft.isStopped.toString()} </p>
      <p>Actual owner: {getEllipsisTxt(nft.streamReceiver)} </p>
      <p>Actual highest bidder: {getEllipsisTxt(nft.marketInfo.bidder)} </p>
      <p>Actual highest bid: {tokenValue(nft.marketInfo.price, 18).toFixed(6) + " AVAX"} </p>
      <div style={{display: "flex", justifyContent: "center"}}>
        <InputNumber style={{width: "180px"}} min="0" step="0.000000000000000001"onChange={(event) => setAmount(event)}/>    
        < Button onClick={makeOffer} style={{color: "orange", backgroundColor: "blue", borderRadius: "15px", border: "0px"}}>Make Offer</Button>
      </div>
    </Card>
  );
}

export default NFTForSale;
