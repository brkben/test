// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IUSDT is IERC20Upgradeable
{   function initialize(string memory name_,string memory symbol_) external;
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);

}