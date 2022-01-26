 //SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//import {RedirectAll, ISuperToken, IConstantFlowAgreementV1, ISuperfluid} from "./RedirectAll.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";
import {IMagePad} from "./IMagePad.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IMarketplace2} from "./IMarketplace2.sol";
import {
    ISuperfluid,
    ISuperToken,
    ISuperApp,
    ISuperAgreement,
    ContextDefinitions,
    SuperAppDefinitions
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

// Interface for ChainlinkKeepers
//interface KeeperCompatibleInterface {
//    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
//    function performUpkeep(bytes calldata performData) external;
//}

//contract MagePadNFT is ERC721, RedirectAll, KeeperCompatibleInterface {
contract MagePadNFT is ERC721 {    
    uint256 tokenId;
    IERC20 mageToken;
    address marketplaceAddress;
    
    //For Kovantestnet
    //ISuperfluid host = ISuperfluid(0xF0d7d1D47109bA426B9D8A3Cde1941327af1eea3);
    //IConstantFlowAgreementV1 cfa = IConstantFlowAgreementV1(0xECa8056809e7e8db04A8fF6e4E82cD889a46FE2F);
    //ISuperToken acceptedToken = ISuperToken(0xe3CB950Cb164a31C66e32c320A800D477019DCFF);
    
    //For Mumbaitestnet  
    //ISuperfluid host = ISuperfluid(0xEB796bdb90fFA0f28255275e16936D25d3418603);
    //IConstantFlowAgreementV1 cfa = IConstantFlowAgreementV1(0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873);
    //ISuperToken acceptedToken = ISuperToken(0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f);

    //For Fujitestnet  
    ISuperfluid host = ISuperfluid(0xf04F2C525819691ed9ABD3D2B7109E1633795e68);
    IConstantFlowAgreementV1 cfa = IConstantFlowAgreementV1(0xED74d30B8034152b0638CB03cc5c3c906dd1c482);
    ISuperToken acceptedToken = ISuperToken(0x296E9c01f80D408741f6e15d62013DDbe1041f1D);

    // Storing single NFT Data
    struct nftData {
        uint256 startingBlockTime;
        uint256 endingBlockTime;
        address streamReceiver;
        uint256 streamAmount;
        uint256 streamRate;
        address streamToken;
        uint256 stakedAmount;
        uint256 securityAmount;
        address minter;
        bool isStopped;
        uint256 originalStreamAmount;
    }

    // Storing all NFTs
    mapping (uint256 => nftData) public allNFTs;

    //constructor (uint256 _interval) ERC721 ("MagePadeNFT", "MPNFT") RedirectAll (host, cfa, acceptedToken, msg.sender){
    constructor (address _mageTokenAddress, address _marketplaceAddress) ERC721 ("HourglassNFT", "HGNFT") {
        mageToken = IERC20(_mageTokenAddress);
        marketplaceAddress = _marketplaceAddress;
        tokenId = 1;
        
        uint256 configWord =
            SuperAppDefinitions.APP_LEVEL_FINAL |
            SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP |
            SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP |
            SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;

        host.registerApp(configWord);
    }

    function checkForUpdate() public view returns(uint256[] memory) {
        uint256[] memory flowsToStop = new uint256[](tokenId);
        uint256 counter = 0;
        for(uint256 i = 1; i < tokenId; i++) {
            if(block.timestamp >= allNFTs[i].endingBlockTime && allNFTs[i].isStopped == false) {
                flowsToStop[counter] = i;
                counter = counter + 1;
            }
        }
        return flowsToStop;        
    }

    function performUpdate(uint256[] memory _flowsToStop) public {
        for(uint256 i = 0; i < _flowsToStop.length; i++) {
            // Stop the Flow
            stopFlow(_flowsToStop[i]);
            //_stopStaking(_flowsToStop[i]);
            // Stop and also withdraw the staked Tokens to the actual nft owner, and the security Amount for the flow is send back to the original minter of the nft
            ISuperToken(allNFTs[_flowsToStop[i]].streamToken).transfer(ownerOf(_flowsToStop[i]), allNFTs[_flowsToStop[i]].stakedAmount);
            // Transferring stake reward
            allNFTs[_flowsToStop[i]].stakedAmount > 0 && mageToken.transfer(ownerOf(_flowsToStop[i]), (2 * allNFTs[_flowsToStop[i]].stakedAmount));
            // if the flow was a bit higher more than the stream amount because it was not correctly stopped than the resulting securityAmount is lower by that amount
            // calculating the actual streamed amount
            uint256 _toMuchStreamedAmount = (block.timestamp - allNFTs[_flowsToStop[i]].endingBlockTime) * allNFTs[_flowsToStop[i]].streamRate;
            uint256 _resultingSecurityAmount = allNFTs[_flowsToStop[i]].securityAmount - _toMuchStreamedAmount;
            ISuperToken(allNFTs[_flowsToStop[i]].streamToken).transfer(allNFTs[_flowsToStop[i]].minter, _resultingSecurityAmount);
            // set NFT to zero
            allNFTs[_flowsToStop[i]].streamRate = 0;
            allNFTs[_flowsToStop[i]].stakedAmount = 0;
            allNFTs[_flowsToStop[i]].securityAmount = 0;
            //_burn(_flowsToStop[i]);
        }
    }

    function withdrawStakedAmount(uint256 _tokenId) public {
        require(msg.sender == ownerOf(_tokenId), "Only owner of the nft can withdraw the staked tokens");
        require(allNFTs[_tokenId].stakedAmount > 0, "Staked tokens were already withdrawed");

        uint256 _stakedAmount = allNFTs[_tokenId].stakedAmount;
        allNFTs[_tokenId].stakedAmount = 0;
        ISuperToken(allNFTs[_tokenId].streamToken).transfer(msg.sender, _stakedAmount);

        //decide wheter or not you get a rewardtoken
        uint256 _originalDuration = allNFTs[_tokenId].endingBlockTime - allNFTs[_tokenId].startingBlockTime;
        uint256 _actualDuration = block.timestamp - allNFTs[_tokenId].startingBlockTime;

        if(_actualDuration > (_originalDuration / 2)) {
            mageToken.transfer(msg.sender, (2 * allNFTs[_tokenId].stakedAmount));
        }
    }

    function mint(address _nftOwner, uint256 _streamAmount, uint256 _streamRate, address _streamToken, uint256 _stakedAmount, address _projectOwner, address _magePadAddress) public payable returns(bool) {      
        require(block.timestamp <= IMagePad(_magePadAddress).getProjectEndingTime(_streamToken), "Projectlaunchperiod is over");
        uint256 _startingBlockTime = block.timestamp;
        uint256 _securityAmount = _streamRate * (60 * 60);
        uint256 streamAmount = _streamAmount;
        address payable projectOwner = payable(_projectOwner);
        //getting the necessary supertoken amount from the magpad contract
        //ISuperToken(_streamToken).transferFrom(_magePadAddress, address(this), (streamAmount + _stakedAmount + _securityAmount));
        IMagePad(_magePadAddress).transferProjectToken(_streamToken, (streamAmount + _stakedAmount + _securityAmount));
        _mint(_nftOwner, tokenId);
        allNFTs[tokenId] = nftData(_startingBlockTime, 0, _nftOwner, _streamAmount, _streamRate, _streamToken, 0, _securityAmount, _projectOwner, false, _streamAmount);
        //sending the staking percentage directly to the nft owner
        ISuperToken(_streamToken).transfer(msg.sender, _stakedAmount);
        _startFlow(tokenId);
        tokenId = tokenId + 1;
        projectOwner.transfer(msg.value);
        return true;
    }

    function _startFlow(uint256 _tokenId) private returns(bool) {
        // calculating the endingBlock
        uint256 _duration = allNFTs[_tokenId].streamAmount / allNFTs[_tokenId].streamRate;
        uint256 _endingBlock = allNFTs[_tokenId].startingBlockTime + _duration;
        allNFTs[_tokenId].endingBlockTime = _endingBlock;
        allNFTs[_tokenId].isStopped = false;
        host.callAgreement(cfa, abi.encodeWithSelector(cfa.createFlow.selector, allNFTs[_tokenId].streamToken, allNFTs[_tokenId].streamReceiver, allNFTs[_tokenId].streamRate, new bytes(0)), "0x");
        return true;
    }

    function stopFlow(uint256 _tokenId) public returns(bool) {
        require(allNFTs[_tokenId].isStopped == false, "Stream is already stopped");
        allNFTs[_tokenId].isStopped = true;
        // calculating the already streamed amount and set the rest of initial streaming amount to the new streamAmount for this nft
        uint256 _actualTime = block.timestamp;
        uint256 _alreadyStreamedAmount = (_actualTime - allNFTs[_tokenId].startingBlockTime) * allNFTs[_tokenId].streamRate;
        // _newStreamAmount as an uint256 value can never be negative
        uint256 _newStreamAmount = 0;
        if(_alreadyStreamedAmount <= allNFTs[_tokenId].streamAmount) {
            _newStreamAmount = allNFTs[_tokenId].streamAmount - _alreadyStreamedAmount;
        }
        allNFTs[_tokenId].streamAmount = _newStreamAmount;
        host.callAgreement(cfa, abi.encodeWithSelector(cfa.deleteFlow.selector, allNFTs[_tokenId].streamToken, address(this), allNFTs[_tokenId].streamReceiver, new bytes(0)), "0x");
        return true;
    }

    function withdraw(uint256 _tokenId) public returns(bool) {
        uint256 balance = ISuperToken(allNFTs[_tokenId].streamToken).balanceOf(address(this));
        ISuperToken(allNFTs[_tokenId].streamToken).transfer(msg.sender, balance);
        //_stopStaking(_tokenId);
        return true;
    }

    function putForSale(uint256 _tokenId, /*uint256 _price,*/ address _magePadNFTAddress) public returns(bool) {
      require(msg.sender == ownerOf(_tokenId), "Only owner of the nft can put it for sale");
      // stop the flow
      stopFlow(_tokenId);
      // transfer the staked token to the original owner
      uint256 _lockedAmount = allNFTs[_tokenId].stakedAmount;
      //decide wheter or not you get a rewardtoken
      uint256 _originalDuration = allNFTs[_tokenId].endingBlockTime - allNFTs[_tokenId].startingBlockTime;
      uint256 _actualDuration = block.timestamp - allNFTs[_tokenId].startingBlockTime;

      if(_actualDuration > (_originalDuration / 2)) {
        mageToken.transfer(msg.sender, (2 * allNFTs[_tokenId].stakedAmount));
      }
      allNFTs[_tokenId].stakedAmount = 0;
      _lockedAmount !=0 && ISuperToken(allNFTs[_tokenId].streamToken).transfer(msg.sender, _lockedAmount);
      setApprovalForAll(marketplaceAddress, true);
      IMarketplace2(marketplaceAddress).setSale(_tokenId, /*_price,*/ _magePadNFTAddress); 

      return true;
    }

    function removeFromSale(uint256 _tokenId, address _magePadNFTAddress) public returns(bool) {
      require(msg.sender == ownerOf(_tokenId), "Only owner of the nft can remove it from sale");
      IMarketplace2(marketplaceAddress).removeSale(_tokenId, _magePadNFTAddress);
      _startFlow(_tokenId);
      return true;
    }

    function getAlreadyStreamed(uint256 _tokenId) public view returns(uint256) {
      uint256 _actualTime = block.timestamp;
      uint256 _alreadyStreamedAmount = (_actualTime - allNFTs[_tokenId].startingBlockTime) * allNFTs[_tokenId].streamRate;
      // #1 stream is stopped beacuse out of money
      if(allNFTs[_tokenId].isStopped && allNFTs[_tokenId].streamAmount == 0) {
          return allNFTs[_tokenId].originalStreamAmount;
      }
      // #2 stream is stopped because nft is put for sale 
      else if(allNFTs[_tokenId].isStopped && allNFTs[_tokenId].streamAmount != 0) {
          return allNFTs[_tokenId].originalStreamAmount - allNFTs[_tokenId].streamAmount;
      }  
      // #3 stream is ongoing
      else {
          return _alreadyStreamedAmount;
      }
    }

    //now I will insert a nice little hook in the _transfer, including the RedirectAll function I need
    function _beforeTokenTransfer(address from, address to, uint256 _tokenId) internal override {
        // should not be called if the nft is minted
        if(from != address(0)) {
            (,int96 outFlowRate,,) = cfa.getFlow(ISuperToken(allNFTs[_tokenId].streamToken), address(this), allNFTs[_tokenId].streamReceiver);
            if(outFlowRate > 0) {
                stopFlow(_tokenId);
                allNFTs[_tokenId].streamReceiver = to;
                allNFTs[_tokenId].isStopped = false;
                host.callAgreement(cfa, abi.encodeWithSelector(cfa.createFlow.selector, allNFTs[_tokenId].streamToken, allNFTs[_tokenId].streamReceiver, allNFTs[_tokenId].streamRate, new bytes(0)), "0x");
            }
            else {
              allNFTs[_tokenId].streamReceiver = to;
              allNFTs[_tokenId].isStopped = false;
              host.callAgreement(cfa, abi.encodeWithSelector(cfa.createFlow.selector, allNFTs[_tokenId].streamToken, allNFTs[_tokenId].streamReceiver, allNFTs[_tokenId].streamRate, new bytes(0)), "0x");
            }
        }
    }
}