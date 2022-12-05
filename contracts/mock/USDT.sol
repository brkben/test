// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";


contract Usd is IERC20Upgradeable, ERC20BurnableUpgradeable{
    function initialize(string memory name_,string memory symbol_) external initializer{
        __ERC20_init_unchained(name_, symbol_);
        __ERC20Burnable_init_unchained();
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external  {
        require(to!=address(0),"Zero address sent");
        _mint(to, amount);
    }

   function decimals() public view virtual override(ERC20Upgradeable) returns (uint8) {
		return 6;
	}


}