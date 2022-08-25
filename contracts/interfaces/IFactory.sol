// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

interface IFactory {
    function marketplace() external returns(address);

    function template721Address() external returns(address);
    function template1155Address() external returns(address);

    function create721Token(string memory name, string memory symbol,address _admin,address creator,address _token20) external returns(address token);
    function create1155Token(string memory uri,address _creator,address _admin,address _token20) external returns (address token1155);
}