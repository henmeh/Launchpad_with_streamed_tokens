import { useState, useEffect } from "react";
import { useMoralis, useNativeBalance, useMoralisCloudFunction} from "react-moralis";
import { Skeleton, Table, Card } from "antd";
import { getEllipsisTxt } from "../../helpers/formatters";
import { CFAABI, CFAAddress, MagePadNFTAddress, SuperTokenABI } from "../../helpers/contractABI";
import Balance from "./Balance.jsx";
import { ConsoleSqlOutlined } from "@ant-design/icons";

function ERC20Balance() {
  const [balanceForFlow, setBalanceForFlow] = useState();
  const { data: balance } = useNativeBalance();
  const { Moralis, user } = useMoralis();
  const walletAddress = user ? user.attributes.ethAddress : null;
  const { data, error, isLoading } = useMoralisCloudFunction(
    "getTokenBalances",
    { walletAddress },
    [],
    { live: true }
  );

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: "25%",
      render: (name) => name,
    },
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
      width: "25%",
      render: (symbol) => symbol,
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: "25%",
      render: (value, item) => (
        <Balance balance={value} decimals={item.decimals} tokenAddress={item.token_address}/>
      ),
    },
    {
      title: "Address",
      dataIndex: "token_address",
      key: "token_address",
      width: "25%",
      render: (address) => getEllipsisTxt(address, 5),
    },
  ];

  return (  
    <div style={{ width: "65vw", backgroundColor: "rgba(50,50,50,0.6)", padding: "10px", boxshadow: "20px 20px", borderRadius: "30px"}}>
      <Skeleton loading={!data}>
        <Table
        //pagination= {false}
        className="ant-table"
          title={() => (
            <h1 style={{color: "orange"}}>{`AVAX Balance ${parseFloat(
              Moralis.Units.FromWei(balance.balance, 18).toFixed(6)
            )}`}</h1>
          )}
          dataSource={data}
          columns={columns}
          rowKey={(record) => {
            return record.token_address;
          }}
        />
      </Skeleton>
    </div>
  );
}
export default ERC20Balance;
