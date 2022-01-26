import React, { useState } from "react";
import { useMoralis, useMoralisCloudFunction } from "react-moralis";
import { Modal, Input, Skeleton } from "antd";
import AddressInput from "../AddressInput";
import { Moralis } from "moralis";
import { MagePadNFTAddress, MarketplaceAddress } from "../../helpers/contractABI";
import NFTBalance from "./NFTBalance";
import MyOffer from "./MyOffer";

Moralis.start({
  serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
  appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
});

function MyOffers() {
  const { Moralis, user } = useMoralis();
  const walletAddress = user ? user.attributes.ethAddress : null;
  const { data, error, isLoading } = useMoralisCloudFunction(
    "getMyOffers",
    { MagePadNFTAddress, walletAddress, MarketplaceAddress },
    [],
    { live: true }
  );

  const styles = {
    NFTs: {
      display: "flex",
      flexWrap: "wrap",
      WebkitBoxPack: "start",
      justifyContent: "flex-start",
      margin: "0 auto",
      //maxWidth: "1000px",
      //width: "100%",
      gap: "10px",
      //backgroundColor: "blue"
    },
  };
 
  return (
    <div style={styles.NFTs}>
        <Skeleton loading={!data}>
          {data &&
            data.map((nft, index) => {
                return (
                  <MyOffer nft={nft} index={index} key={index} />
                );
              }
            )}
        </Skeleton>
      </div>
  );
}

export default MyOffers;