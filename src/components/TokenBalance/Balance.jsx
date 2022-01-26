import React, { useState, useEffect } from "react";
import { useMoralis, useMoralisCloudFunction } from "react-moralis";
import SuperfluidSDK from "@superfluid-finance/js-sdk";
import { Moralis } from "moralis";
import { Web3Provider } from "@ethersproject/providers";
import { SuperTokenABI } from "../../helpers/contractABI";
import { ethers } from "ethers";
import { Framework } from "@superfluid-finance/sdk-core";
import Web3 from "web3";


Moralis.start({
    serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
    appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
  });
  


function Balance({balance, decimals, tokenAddress}) {
    const { Moralis, user } = useMoralis();
    const walletAddress = user ? user.attributes.ethAddress : null;
    const { data, error, isLoading } = useMoralisCloudFunction("getSuperTokens");
    const [ tokenBalance, setTokenBalance ] = useState("");
    const [ tokenFlow, setTokenFlow ] = useState(0);

    const initialzeSuperFluid = async () => {
        if(data) {
            console.log(tokenAddress);
            if(data.includes(tokenAddress)) {
                const web3 = await Moralis.enableWeb3();
                const web3_1 = new Web3("wss://speedy-nodes-nyc.moralis.io/cff6f789838e10c4008b1baa/avalanche/testnet/ws");
                const sf = new SuperfluidSDK.Framework({web3: web3});
                await sf.initialize();
                //create user
                const tokenUser = sf.user({address: walletAddress, token: tokenAddress});
                
                const contract = new web3.eth.Contract(SuperTokenABI, tokenAddress);
                const balance = await contract.methods.balanceOf(walletAddress).call();
                setTokenBalance(balance);                  
        
                const interval = setInterval(async () => {
                    const details = await tokenUser.details();
                    setTokenFlow(parseInt(details.cfa.netFlow));
                    setTokenBalance(tokenBalance => parseInt(tokenBalance) + parseInt(details.cfa.netFlow) / 10);
                }, 100);
                return () => clearInterval(interval);
            }
            else {
                setTokenBalance(balance);
            }
        }
    }

    useEffect(() =>{
        initialzeSuperFluid();
    },[data, tokenFlow, balance])

    if(tokenFlow === 0) {
        return (
            <div>
                {parseFloat(Moralis.Units.FromWei(tokenBalance, decimals).toFixed(6))}
            </div>
        )
    }

    else if(tokenFlow > 0) {
        return (
            <div style={{color: "green"}}>
                {parseFloat(Moralis.Units.FromWei(tokenBalance, decimals).toFixed(6))}
            </div>
        )
    }

    else {
        return (
            <div style={{color: "red"}}>
                {parseFloat(Moralis.Units.FromWei(tokenBalance, decimals).toFixed(6))}
            </div>
        )
    }

}
export default Balance;
