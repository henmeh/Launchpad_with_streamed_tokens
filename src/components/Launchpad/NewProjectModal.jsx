import React, { useState } from "react";
import {
  Form,
  Button,
  Input,
  Card,
  Radio,
  InputNumber,
  Dropdown,
  Menu,
  Space,
  Spin,
} from "antd";
import { Moralis } from "moralis";
import { useMoralis, useMoralisCloudFunction } from "react-moralis";
import {IERC20ABI, ISuperTokenABI, MagePadABI, MagePadAddress, SuperTokenFactoryABI, SuperTokenFactoryAddress} from "../../helpers/contractABI";

Moralis.start({
  serverUrl: process.env.REACT_APP_MORALIS_SERVER_URL,
  appId: process.env.REACT_APP_MORALIS_APPLICATION_ID,
});

const NewProjectModal = ({ open, onClose }) => {
  const [projectName, setProjectName] = useState("");
  const [projectLaunchDuration, setProjectLaunchDuration] = useState("");
  const [projectTokenAddress, setProjectTokenAddress] = useState();
  const [projectTokenConversionRate, setprojectTokenConversionRate] = useState("");
  const [projectTokenAmount, setProjectTokenAmount] = useState();
  const [projectTokenName, setProjectTokenName] = useState("Choose a Token");
  const [projectTokenSymbol, setProjectTokenSymbol] = useState("");
  const [projectTokenDecimals, setProjectTokenDecimals] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const [nftStreamDuration, setnftStreamDuration] = useState();
  const [nftStreamPercentage, setnftStreamPercentage] = useState("0.7");
  const [nftStreamPeriod, setnftStreamPeriod] = useState("days");

  const { Moralis, user } = useMoralis();
  const walletAddress = user ? user.attributes.ethAddress : null;
  const { data, error } = useMoralisCloudFunction(
    "getTokenBalances",
    { walletAddress },
    [],
    { live: true }
  );

  const create = async function () {
    setIsLoading(true);
    //check if projecttoken is a superfluid token
    const superTokens = await Moralis.Cloud.run("getSuperTokens");
    let _projectSuperTokenAddress;
    let _projectERC20TokenAddress;
    let _projectTokenName;
    let _projectTokenSymbol;
    let _projectTokenAmount = (projectTokenAmount * 10**projectTokenDecimals).toString();
    let _isSupertoken;
    //calculating projectduration in seconds
    const _projectLaunchDuration = projectLaunchDuration * 24 * 60 * 60;

    //#1 projecttoken is a supertoken
    if(superTokens.includes(projectTokenAddress)) {
        _projectSuperTokenAddress = projectTokenAddress;
        _projectERC20TokenAddress = projectTokenAddress;
        _projectTokenName = projectTokenName;
        _projectTokenSymbol = projectTokenSymbol;
        _isSupertoken = 1;
        
        //allow the magepad contract to handle my supertoken token
        const optionsApproveSuperToken = {
            contractAddress: _projectSuperTokenAddress,
            functionName: "approve",
            abi: ISuperTokenABI,
            params: {
              spender: MagePadAddress,
              amount: _projectTokenAmount,
            },
          };
        await Moralis.executeFunction(optionsApproveSuperToken);
    }
    //#2 projecttoken is not a supertoken
    else {
        //deploy the wrapper
        _projectTokenName = "Super" + projectTokenName;
        _projectTokenSymbol = projectTokenSymbol + "x";
        _projectERC20TokenAddress = projectTokenAddress;
        _isSupertoken = 2;

        const optionsWrapper = {
            contractAddress: SuperTokenFactoryAddress,
            functionName: "createERC20Wrapper",
            abi: SuperTokenFactoryABI,
            params: {
                underlyingToken: _projectERC20TokenAddress,
                upgradability: 1,
                name: _projectTokenName,
                symbol: _projectTokenSymbol,
            },
        };
        const createWrapper = await Moralis.executeFunction(optionsWrapper);
        _projectSuperTokenAddress = createWrapper.events.SuperTokenCreated.returnValues.token;

        //saving the address
        const Supertoken = Moralis.Object.extend("Superfluidtokens");
        const supertoken = new Supertoken();

        supertoken.set("tokenAddress", _projectSuperTokenAddress);
        await supertoken.save();

        //allow the magepad contract to handle my erc20 token
        const optionsApproveERC20 = {
            contractAddress: _projectERC20TokenAddress,
            functionName: "approve",
            abi: IERC20ABI,
            params: {
              spender: MagePadAddress,
              amount: _projectTokenAmount,
            },
          };
        await Moralis.executeFunction(optionsApproveERC20);
    }

    //create the project onChain
    const optionsCreateProject = {
        contractAddress: MagePadAddress,
        functionName: "createProject",
        abi: MagePadABI,
        params: {
            _isSupertoken: _isSupertoken,
            _superTokenAddress: _projectSuperTokenAddress,
            _erc20TokenAddress: _projectERC20TokenAddress,
            _amount: _projectTokenAmount,
            _projectDuration: _projectLaunchDuration,
        },
    };
    await Moralis.executeFunction(optionsCreateProject);

    let moralisFile;
    const fileUploadControl = document.getElementById("profilePhotoFileUpload");
    if (fileUploadControl.files.length > 0) {
        const file = fileUploadControl.files[0];
        const name = projectName + ".jpg";
        moralisFile = new Moralis.File(name, file);
        await moralisFile.save();
    }
    const Project = Moralis.Object.extend("Launchprojects");
    const project = new Project();

    project.set("name", projectName);
    project.set("image", moralisFile);
    project.set("tokenAddress", _projectSuperTokenAddress);
    project.set("tokenName", _projectTokenName);
    project.set("tokenSymbol", _projectTokenSymbol);
    project.set("tokenDecimals", projectTokenDecimals);
    project.set("tokenAmount", projectTokenAmount);
    project.set("conversionRate", projectTokenConversionRate);
    project.set("launchduration", projectLaunchDuration);
    project.set("streamduration", nftStreamDuration);
    project.set("streamperiod", nftStreamPeriod);
    project.set("streampercentage", nftStreamPercentage);
    project.set("projectCreator", walletAddress);
    project.set("projectCreation", Date.now());

    await project.save();

    setIsLoading(false);

    onClose();
};

  let menu;
  if (data) {
    menu = (
      <Menu>
        {data.map((item, index) => (
          <Menu.Item key={index}>
            <Button
              type="text"
              onClick={() => {
                setProjectTokenAddress(item.token_address);
                setProjectTokenName(item.name);
                setProjectTokenDecimals(item.decimals);
                setProjectTokenSymbol(item.symbol);
              }}
            >
              {item.name}
            </Button>
          </Menu.Item>
        ))}
      </Menu>
    );
  }

  const styles = {
    modal: {
      height: "100vh",
      width: "100vw",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      position: "fixed",
      top: "0",
      left: "0",
      zIndex: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  };

  return (
    <div style={styles.modal}>
      <Card
        title={
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ color: "orange" }}> Create new Project</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              onClick={onClose}
              color="orange"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </div>
        }
        hoverable
        bordered={false}
        style={{
          //width: 380,
          background: "linear-gradient(45deg, rgba(2,0,36,1) 10%, rgba(9,9,121,1) 50%, rgba(138,43,226,1) 90%)",
          padding: "10px",
          boxshadow: "20px 20px",
          borderRadius: "30px",
          color: "white",
        }}
      >
        <div>
            <h3 style={{ color: "orange",  display: "flex", justifyContent: "center" }}>Projectinformation</h3>
        </div>
        <Form.Item label={<h4 style={{ color: "white" }}>Choose a picture for your project</h4>}>
            <Input type="file" id="profilePhotoFileUpload"/>
        </Form.Item>
        <Form name="newproject" labelCol={{ span: 25 }}>
          <Form.Item label={<h4 style={{ color: "white" }}>Projectname</h4>}>
            <Input onChange={(event) => setProjectName(event.target.value)} />
          </Form.Item>
          <Form.Item
            label={<h4 style={{ color: "white" }}>Projecttoken</h4>}
            //rules={[{ required: true, message: 'Please select a token!' }]}
          >
            <Space wrap>
              <Dropdown.Button overlay={menu} placement="bottomCenter">
                {projectTokenName}
              </Dropdown.Button>
            </Space>
          </Form.Item>
          <Form.Item label={<h4 style={{ color: "white" }}>Conversionrate (1 AVAX = x Amount Projecttokens)</h4>}>
            <InputNumber defaultValue={0} onChange={(value) => setprojectTokenConversionRate(value)} />
          </Form.Item>
          <Form.Item label={<h4 style={{ color: "white" }}>Projecttokenamount for Launch</h4>}>
            <InputNumber defaultValue={0} onChange={(value) => setProjectTokenAmount(value)} />
          </Form.Item>
          <Form.Item label={<h4 style={{ color: "white" }}>Launchduration (in Days)</h4>}>
            <InputNumber defaultValue={0} onChange={(value) => setProjectLaunchDuration(value)} />
          </Form.Item>
        </Form>
        <div>
            <h3 style={{ color: "orange",  display: "flex", justifyContent: "center"}}>NFT Information</h3>
        </div>
        <Form name="newproject" labelCol={{ span: 25 }}>
          <Form.Item
            label={<h4 style={{ color: "white" }}>Streamingduration</h4>}
            //rules={[{ required: true, message: 'Please select a token!' }]}
          >
            <InputNumber defaultValue={0} onChange={(value) => setnftStreamDuration(value)} />
            <Radio.Group
              onChange={({ target: { value } }) => setnftStreamPeriod(value)}
              value={nftStreamPeriod}
            >
              <Radio value="days" style={{ color: "white" }}>
                Days
              </Radio>
              <Radio value="weeks" style={{ color: "white" }}>
                Weeks
              </Radio>
              <Radio value="months" style={{ color: "white" }}>
                Months
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label={
              <h4 style={{ color: "white" }}>
                Vested to be unlocked through tokenstream
              </h4>
            }
            //rules={[{ required: true, message: 'Please select a token!' }]}
          >
            <Radio.Group
              onChange={({ target: { value } }) => setnftStreamPercentage(value)}
              value={nftStreamPercentage}
            >
              <Radio value="1" style={{ color: "white" }}>
                100%
              </Radio>
              <Radio value="0.9" style={{ color: "white" }}>
                90%
              </Radio>
              <Radio value="0.8" style={{ color: "white" }}>
                80%
              </Radio>
              <Radio value="0.7" style={{ color: "white" }}>
                70%
              </Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
        <div style={{ display: "flex", justifyContent: "center" }}>
        {isLoading ? <Spin /> : 
        
          <Button
            onClick={create}
            style={{
              color: "orange",
              backgroundColor: "blue",
              borderRadius: "15px",
              border: "0px",
            }}
          >
            Create Project
          </Button>}
        </div>
      </Card>
    </div>
  );
};

export default NewProjectModal;
