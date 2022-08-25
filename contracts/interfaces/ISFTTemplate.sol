// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "../libraries/VoucherLib.sol";

interface ISFTTemplate is IERC1155Upgradeable, IERC2981
{
    function creator() external returns(address);
    function admin() external returns(address);
    
    function initialize(string memory uri, address _creator, address _admin, address _factory) external ;

    function supportsInterface(bytes4 interfaceId) override(IERC165Upgradeable,IERC165) external view returns (bool);
    function redeem(Voucher.SFTvoucher calldata _voucher, address redeemer, uint amount) external;
}
