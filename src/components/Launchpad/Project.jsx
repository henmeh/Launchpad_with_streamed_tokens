import React, { useState, useEffect } from "react";
import { useMoralis } from "react-moralis";
import { Card, Image, Button, InputNumber } from "antd";
import { Moralis } from "moralis";
import { MagePadNFTAddress, MagePadNFTABI, MagePadAddress, MagePadABI } from "../../helpers/contractABI";
import { DateConverted } from "../../helpers/formatters";
import { Liquid } from "@ant-design/plots";

Moralis.start({
  serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
  appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
});

function Project({ project, index }) {
  const { Moralis, user } = useMoralis();
  const _walletAddress = user ? user.attributes.ethAddress : null;
  const [tokenAmount, setTokenAmount] = useState();
  const [availableTokenToInvest, setAvailableTokenToInvest] = useState("");
  const [percentage, setPercentage] = useState("");
  const [transaction, setTransaction] = useState("");

  const fetchProjectTokenBalance = async function () {
    const web3 = await Moralis.enableWeb3();
    const contract = new web3.eth.Contract(MagePadABI, MagePadAddress);
    const projectTokenBalance = await contract.methods.projects(project.attributes.tokenAddress).call();
    const availableToken = parseInt(projectTokenBalance.tokenBalance) / 10**(parseInt(project.attributes.tokenDecimals));
    const _percentage = availableToken / project.attributes.tokenAmount;
    setAvailableTokenToInvest(availableToken.toFixed(6));
    setPercentage(_percentage); 
  }

  let config;
  if(percentage != "") {
    config = {
      percent: percentage,
      shape: 'circle',
      outline: {
        border: 2,
        distance: 4,
      },
      wave: {
        length: 128,
      },
    };
  }

  useEffect(() => {
    fetchProjectTokenBalance();
  },[transaction])
  
  const invest = async function () {
    const web3 = new Moralis.Web3();
    const streamAmount = (parseFloat(tokenAmount) * 10**parseFloat(project.attributes.tokenDecimals)) * parseFloat(project.attributes.streampercentage);
    const stakedAmount = (parseFloat(tokenAmount) * 10**parseFloat(project.attributes.tokenDecimals)) - streamAmount;
    let streamRate;
    if (project.attributes.streamperiod === "days") {
        streamRate = Math.round(streamAmount / (project.attributes.streamduration * 24 * 60 * 60));
    }
    if (project.attributes.streamperiod === "weeks") {
        streamRate = Math.round(streamAmount / (project.attributes.streamduration * 7 * 24 * 60 * 60));
    }
    if (project.attributes.streamperiod === "months") {
        streamRate = Math.round(streamAmount / (project.attributes.streamduration * 30 * 24 * 60 * 60));
    }
    const sendingAVAX = parseFloat(tokenAmount) * 10**parseFloat(project.attributes.tokenDecimals) / (project.attributes.conversionRate * 10**parseFloat(project.attributes.tokenDecimals));

    const optionsApproveSuperToken = {
      contractAddress: MagePadNFTAddress,
      functionName: "mint",
      abi: MagePadNFTABI,
      msgValue: web3.utils.toWei(sendingAVAX.toString(), "ether"), 
      params: {
        _nftOwner: _walletAddress,
        _streamAmount: streamAmount.toString(),
        _streamRate: streamRate.toString(),
        _streamToken: project.attributes.tokenAddress,
        _stakedAmount: stakedAmount.toString(),
        _projectOwner: project.attributes.projectCreator,
        _magePadAddress: MagePadAddress
      },
    };
    const tx = await Moralis.executeFunction(optionsApproveSuperToken);
    setTransaction(tx);
  }

  return (
      <Card
      hoverable
      bordered={false}
      style={{
        width: 490,
        backgroundColor: "rgba(50,50,50,0.6)",
        padding: "10px",
        boxshadow: "20px 20px",
        borderRadius: "30px",
        color: "white",
      }}
      cover={
        <div style={{display: "flex", flexDirection:"row", justifyContent:"space-between"}}>
            <div style={{display: "flex", flexDirection:"column", color: "orange"}}>
                <h2 style={{color: "orange"}}>{project.attributes.name}</h2>
                <p style={{color: "orange"}}>{"1 AVAX = " + project.attributes.conversionRate + " " + project.attributes.tokenSymbol}</p>
            </div>
            <Image
                width={100}
                height={100}
                style={{borderRadius: "50px"}}
                src={project.attributes.image._url} />
        </div>
      }
      //key={nft.id}
    >
        <div style={{display: "flex", flexDirection:"column", color: "orange"}}>
            <p>Token: {project.attributes.tokenName}</p>
            <div style={{display: "flex", flexDirection: "row", justifyContent:"space-between", width: "570px"}}>
            <p>Available Tokenamount: {availableTokenToInvest != "" && availableTokenToInvest + " / " + project.attributes.tokenAmount}</p>
            <div style={{height: "150px", position: "relative", zIndex: "0"}}><Liquid {...config} /></div>
            </div>
            <p>Launchending: {DateConverted(project.attributes.projectCreation + (parseFloat(project.attributes.launchduration) * 24 * 60 * 60 * 1000))}</p>
            <p>Initial Streamduration: {project.attributes.streamduration + " " + project.attributes.streamperiod}</p>
            <p>Tokenpercentage locked for the Stream: {(parseFloat(project.attributes.streampercentage) * 100).toString() + " %"} </p>
        </div>
        <div style={{display: "flex", justifyContent: "center", gap: "20px"}}>
            <p style={{color: "orange"}}> Tokenamount you want to invest in</p>
            <InputNumber defaultValue={0} onChange={(value) => setTokenAmount(value)} />
            <Button
                onClick={invest}
                style={{
                color: "orange",
                backgroundColor: "blue",
                borderRadius: "15px",
                border: "0px",
                }}
            >
                Invest
            </Button>
        </div>
    </Card>
  );
}

export default Project;