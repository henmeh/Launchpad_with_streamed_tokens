import React, { useState } from "react";
import { useMoralis, useMoralisCloudFunction } from "react-moralis";
import { Modal, Input, Skeleton } from "antd";
import AddressInput from "../AddressInput";
import { Moralis } from "moralis";
import { MagePadNFTAddress, MarketplaceAddress } from "../../helpers/contractABI";
import NFTBalance from "./NFTBalance";
import MyOffers from "./MyOffers";

Moralis.start({
  serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
  appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
});

const styles = {
  NFTs: {
    display: "flex",
    flexWrap: "wrap",
    WebkitBoxPack: "start",
    justifyContent: "flex-start",
    margin: "0 auto",
    maxWidth: "1000px",
    //width: "100%",
    gap: "10px",
    //backgroundColor: "red"
  },
};

function NFTBalances() {
  const { Moralis, user } = useMoralis();
  const walletAddress = user ? user.attributes.ethAddress : null;
  const { data, error, isLoading } = useMoralisCloudFunction(
    "getMyMageNFTs",
    { MagePadNFTAddress, walletAddress, MarketplaceAddress },
    [],
    { live: true }
  );
 
  return (
    <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "space-between", width: "100%"}}>
      <div style={styles.NFTs}>
        <Skeleton loading={!data}>
          {data &&
            data.map((nft, index) => {
                return (
                  <NFTBalance nft={nft} index={index} key={nft.id} />
                );
              }
            )}
        </Skeleton>
      </div>
      <MyOffers />
    </div>
  );
}

export default NFTBalances;
