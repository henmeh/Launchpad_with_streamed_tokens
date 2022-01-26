import React, { useState, useEffect } from "react";
import { useMoralis, useMoralisCloudFunction } from "react-moralis";
import { Card, Image, Button, Spin } from "antd";
import { Moralis } from "moralis";
import { MagePadNFTAddress, MagePadNFTABI, MarketplaceAddress } from "../../helpers/contractABI";
import { getEllipsisTxt, tokenValue } from "../../helpers/formatters";
import moneyFlow from "../../images/moneyFlow.jpg";
import "./nftbalance_styling.css";
import { Line } from "@ant-design/charts";
var QRCode = require('qrcode.react');


Moralis.start({
  serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
  appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
});

function NFTBalance({ nft, index }) {
  const tokenId = nft.tokenId;
  let config;
  const { Moralis, user } = useMoralis();
  const [alreadyStreamed, setAlreadyStreamed] = useState(parseInt(nft.alreadyStreamed));
  const [leftToStream, setLeftToStream] = useState(0);
  const [showDiagramm, setShowDiagramm] = useState(false);
  const [isStateLoading, setIsStateLoading] = useState(false);
  const _walletAddress = user ? user.attributes.ethAddress : null;
  const { data, error, isLoading } = useMoralisCloudFunction(
    "getPricehistory",
    { MagePadNFTAddress, tokenId },
    [],
    { live: true }
  );
 
  useEffect(() => {
    if(nft.isStopped === true) {
      setLeftToStream(nft.streamAmount);
    }
    else {
      setLeftToStream(parseInt(nft.streamAmount) - parseInt(nft.alreadyStreamed))
      const interval = setInterval(() => {
        if(!nft.isStopped) {
          setAlreadyStreamed(alreadyStreamed => alreadyStreamed + parseInt(nft.streamRate) / 10);
          setLeftToStream(leftToStream => leftToStream - parseInt(nft.streamRate) / 10);
        }
        }, 100);
        return () => clearInterval(interval);
    }
  }, [isStateLoading]);

  if(data) {
    config = {
      data: data,
      padding: 'auto',
      xField: 'date',
      yField: 'price',
      color: "orange",
      xAxis: { title: {text: "Date", style:{fill: "orange"}}, label: {style:{fill: "orange"}}},
      yAxis: { title: {text: "Price", style:{fill: "orange"}}, label: {style:{fill: "orange"}}}
    };  
  };

  async function putOnSale() {
    setIsStateLoading(true);
    const options = {
      contractAddress: MagePadNFTAddress,
      functionName: "putForSale",
      abi: MagePadNFTABI,
      params: {
        _tokenId: nft.tokenId,
        _magePadNFTAddress: MagePadNFTAddress
      }
    };
    await Moralis.executeFunction(options);
    const NewSale = Moralis.Object.extend("NewSale");
    const newSale = new NewSale();

    newSale.set("tokenId", nft.tokenId);
    newSale.set("magePadNFTAddress", MagePadNFTAddress);

    await newSale.save();
    setIsStateLoading(false);
  }

  async function removeOffer() {
    setIsStateLoading(true);
    const options = {
      contractAddress: MagePadNFTAddress,
      functionName: "removeFromSale",
      abi: MagePadNFTABI,
      params: {
        _tokenId: nft.tokenId,
        _magePadNFTAddress: MagePadNFTAddress
      }
    };
    await Moralis.executeFunction(options);

    const params = {
      tokenId: nft.tokenId,
      MagePadNFTAddress: MagePadNFTAddress,
    };

    await Moralis.Cloud.run("deleteOfferFromSale", params);
    setIsStateLoading(false);
  }

  async function acceptOffer() {
    setIsStateLoading(true);
    const params = {
      tokenId: nft.tokenId,
      walletAddress: _walletAddress,
      MagePadNFTAddress: MagePadNFTAddress,
      MarketplaceAddress: MarketplaceAddress,
  }
  await Moralis.Cloud.run("acceptFinalOffer", params);
  setIsStateLoading(false);
  }

  return (
      <Card
      hoverable
      bordered={false}
      style={{
        //width: 480,
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
            <QRCode value={"Hallo"} size={250}/>
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
      <h3 style={{ color: "orange" }}>{nft.name + " " + nft.tokenId} </h3>
      <div style={{display: "flex", flexDirection: "row"}}>
        <p>Already streamed Token:</p>
        {nft.isStopped ? <p style={{color: "white"}}>{tokenValue(alreadyStreamed, 18).toFixed(6)}</p> : <p style={{color: "green"}}>{tokenValue(alreadyStreamed, 18).toFixed(6)}</p>}
      </div>
      <p>Streamrate per second: {tokenValue(nft.streamRate, 18).toFixed(6)} </p>
      <div style={{display: "flex", flexDirection: "row"}}>
        <p> Tokens left for Stream: </p>
        {nft.streamAmount == 0
          ? <p style={{color: "white"}}>{tokenValue(nft.streamAmount, 18).toFixed(6)}</p>
          : 
          nft.isStopped ? <p style={{color: "white"}}>{tokenValue(nft.streamAmount, 18).toFixed(6)}</p> :
          
          <p style={{color: "red"}}>{tokenValue(leftToStream, 18).toFixed(6)}</p>}
      </div>
      <p>Streamed Tokenaddress: {getEllipsisTxt(nft.streamToken)} </p>
      <p>Stream is stopped: {nft.isStopped.toString()} </p>
      <p>Stream goes to: {getEllipsisTxt(nft.streamReceiver)} </p>
      <p>Is for sale on the market: {nft.marketInfo.isActive.toString()}</p>
      {nft.marketInfo.isActive === true && <p>Actual highest bidder: {getEllipsisTxt(nft.marketInfo.bidder)} </p>}
      {nft.marketInfo.isActive === true && <p>Actual highest bid: {tokenValue(nft.marketInfo.price, 18).toFixed(6) + " AVAX"} </p>}
      {nft.marketInfo.isActive === true && <p>Offer accepted: {nft.marketInfo.offerAccepted.toString()} </p>}
      {nft.marketInfo.isActive === false ?
      <div style={{display: "flex", justifyContent: "center"}}>
        < Button onClick={putOnSale} style={{color: "orange", backgroundColor: "blue", borderRadius: "15px", border: "0px"}}>Put on Sale</Button>
      </div>
       :
       nft.marketInfo.isActive === true && !nft.marketInfo.offerAccepted ?  
      <div style={{display: "flex", justifyContent: "space-around"}}>
        < Button onClick={removeOffer} style={{color: "orange", backgroundColor: "blue", borderRadius: "15px", border: "0px"}}>Remove Offer</Button>
        < Button onClick={acceptOffer} style={{color: "orange", backgroundColor: "blue", borderRadius: "15px", border: "0px"}}>Accept Offer</Button>
      </div> 
        :
        <div style={{display: "flex", justifyContent: "center"}}>
        < Button onClick={removeOffer} style={{color: "orange", backgroundColor: "blue", borderRadius: "15px", border: "0px"}}>Remove Offer</Button>
        </div>
      }
    </Card>
  );
}

export default NFTBalance;