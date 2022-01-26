 //SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
//import {ISuperTokenFactory} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperTokenFactory.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

contract MagePad {

    address owner;
    //ISuperTokenFactory superTokenFactory = ISuperTokenFactory(0xA25dbEa94C5824892006b30a629213E7Bf238624);
    address magePadNFTAddress;

    struct Project {
        uint256 tokenBalance;
        address tokenOwner;
        uint256 projectEndingTime;
    }

    mapping(address => Project) public projects;

    constructor(address _magePadNFTAddress) {
        owner = msg.sender;
        magePadNFTAddress = _magePadNFTAddress;
        //superTokenFactory = ISuperTokenFactory(_superTokenFactory);
    }

    function createProject(uint8 _isSupertoken, address _superTokenAddress, address _erc20TokenAddress, uint256 _amount, uint256 _projectDuration) public {
        uint256 _projectEndingTime = block.timestamp + _projectDuration;
        projects[_superTokenAddress] = Project(_amount, msg.sender, _projectEndingTime);  
        if(_isSupertoken == 1) {
            //get the supertoken out of the senders pocket and store the balance in the mapping
            ISuperToken(_superTokenAddress).transferFrom(msg.sender, address(this), _amount);
        } 
        if(_isSupertoken == 2) {
            //create wrapper
            //ISuperToken newSuperToken = superTokenFactory.createERC20Wrapper(_erc20TokenAddress, 1, "test", "tt");
            //get the erc20 token out of the senders pocket, store and start upgrading
            IERC20(_erc20TokenAddress).transferFrom(msg.sender, address(this), _amount);
            //approve wrapper to spend ERC20_token
            IERC20(_erc20TokenAddress).approve(_superTokenAddress, _amount);
            //upgrading the ERC20_token 
            ISuperToken(_superTokenAddress).upgrade(_amount);        
        }
        //allow the magepadNFT to spend the supertokens
        //ISuperToken(_superTokenAddress).approve(magePadNFTAddress, _amount);        
    }

    function transferProjectToken(address _superTokenAddress, uint256 _amount) public {
        require(projects[_superTokenAddress].tokenBalance >= _amount, "Not enough balance to send");
        projects[_superTokenAddress].tokenBalance = projects[_superTokenAddress].tokenBalance - _amount;
        ISuperToken(_superTokenAddress).transfer(magePadNFTAddress, _amount);
    }

    function withdrawFunds(address _tokenAddress) public {
        require(msg.sender == projects[_tokenAddress].tokenOwner, "Only creator of project can withdraw the funds");
        require(projects[_tokenAddress].tokenBalance > 0, "No funds available");
        require(block.timestamp >= projects[_tokenAddress].projectEndingTime, "Project is still ongoing");

        uint256 balance = projects[_tokenAddress].tokenBalance;
        delete projects[_tokenAddress];

        ISuperToken(_tokenAddress).transfer(msg.sender, balance);
    }

    function getProjectEndingTime(address _superTokenAddress) public view returns(uint256) {
        return (projects[_superTokenAddress].projectEndingTime);
    }
}