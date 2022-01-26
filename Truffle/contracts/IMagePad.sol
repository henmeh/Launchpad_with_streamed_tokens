 //SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMagePad {

    function createProject(bool _isSupertoken, address _superTokenAddress, address _erc20TokenAddress, uint256 _amount, uint256 _projectDuration) external;
    function withdrawFunds(address _tokenAddress) external;
    function getProjectEndingTime(address _superTokenAddress) external view returns(uint256);
    function transferProjectToken(address _superTokenAddress, uint256 _amount) external;
}