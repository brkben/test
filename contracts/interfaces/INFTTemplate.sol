// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "../libraries/VoucherLib.sol";

interface INFTTemplate is IERC721Upgradeable, IERC2981
{
    function creator() external returns(address);
    function admin() external returns(address);
    
    function initialize(string memory name ,string memory symbol,address _admin,address _superAdmin, address _marketplace,uint _maxSupply)external ;

    function supportsInterface(bytes4 interfaceId) override(IERC165Upgradeable,IERC165) external view returns (bool);
    function redeem(Voucher.NFTvoucher calldata _voucher, address redeemer) external;
    function transferFrom(address from,address to,uint256 tokenId) external override;
   
    function exists(uint tokenId) external view returns(bool);
}
