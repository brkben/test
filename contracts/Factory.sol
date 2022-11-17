// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/INFTTemplate.sol";
import "./interfaces/ISFTTemplate.sol";
import "./interfaces/IProxy.sol";
import "./Relayer/BasicMetaTransaction.sol";
import "./libraries/VoucherLib.sol";
import "./OwnedUpgradeabilityProxy.sol";

contract TokenFactory is Initializable, BasicMetaTransaction {
    // Admin of the contract
    address public admin;

    // Template of ERC721
    address public template721Address;

    // Template of ERC1155
    address public template1155Address;

    // Template of proxy
    address public proxy;

    // Marketplace address
    address public marketplace;

    // Counter to create unique salt
    uint256 public counter;

    // Mapping of last contract deployed by any address
    mapping(address => mapping(uint256 => address)) public userNFTContracts;

    // Mapping of the operator which have specific accesses
    mapping(address => bool) public operators;

    event ERC721Created(address indexed token, string name, string symbol, uint maxSupply);
    event ERC1155Created(address indexed token, string uri);
    event TokenWithdrawn(uint256 _amount);

    /**
     * @dev Initializes the contract by setting a `template721Address`, `template1155Address` and `marketplace` for the contract
     * @param _template721Address is set as the template of ERC721 that will be redeployed using create721Token()
     * @param _template1155Address is set as the template of ERC1155 that will be redeployed using create1155Token()
     * @param _marketplace is set as the address of the marketplace contract
     */
    function initialize(
        address _template721Address,
        address _template1155Address,
        address _proxy,
        address _marketplace
    ) external initializer {
        admin = msg.sender;
        template721Address = _template721Address;
        template1155Address = _template1155Address;
        proxy = _proxy;
        marketplace = _marketplace;
        operators[msg.sender] = true;
    }

    /**
     * @notice deploys a clone of the ERC721 template contracts using the openzeppelin clones contract
     * @param name is set as the name of the deployed ERC721
     * @param symbol is set as the symbol of the deployed ERC721
     * @param _admin is set as the admin of the deployed ERC721 which will be the creator itself
     * @param _creator is set as the admin of the deployed ERC721 which will be the creator itself
     * @param _maxSupply is set as the maximum supply of the ERC721
     */
    function create721Token(
        string memory name,
        string memory symbol,
        address _admin,
        address _creator,
        uint _maxSupply
    ) external returns (address tokenProxy) {
        require(operators[msg.sender], "not operator");
        uint count = counter;
        tokenProxy = address(new OwnedUpgradeabilityProxy());
        userNFTContracts[msg.sender][count] = tokenProxy;
        counter = count + 1;
        
        IProxy(tokenProxy).upgradeTo(template721Address);
        INFTTemplate(tokenProxy).initialize(
            name,
            symbol,
            _creator,
            _admin,
            address(this),
            _maxSupply
        );

        emit ERC721Created(tokenProxy, name, symbol, _maxSupply);
    }

    /**
     * @notice deploys a clone of the ERC1155 template contracts using the openzeppelin clones contract
     * @param uri is set as the uri of the deployed ERC1155
     * @param _creator is set as the admin of the deployed ERC1155 which will be the creator itself
     * @param _admin is set as the second admin of the deployed ERC1155 which will be the platform owner
     */
    function create1155Token(
        string memory uri,
        address _creator,
        address _admin
    ) external returns (address token1155Proxy) {
        require(operators[msg.sender], "not operator");
        uint count = counter;
        token1155Proxy = address(new OwnedUpgradeabilityProxy());
        userNFTContracts[msg.sender][count] = token1155Proxy;
        counter = count + 1;

        IProxy(token1155Proxy).upgradeTo(template1155Address);
        ISFTTemplate(token1155Proxy).initialize(
            uri,
            _creator,
            _admin,
            address(this)
        );

        emit ERC1155Created(token1155Proxy, uri);
    }

    /**
     * @notice Function to update the template of ERC721
     * @param _template is the new template address
     */
    function updateTemplate721(address _template) external {
        require(_template != address(0), "Zero address sent");
        require(msg.sender == admin, "TokenFactory: Caller not admin");
        template721Address = _template;
    }

    /**
     * @notice Function to update the template of ERC1155
     * @param _template is the new template address
     */
    function updateTemplate1155(address _template) external {
        require(_template != address(0), "Zero address sent");
        require(msg.sender == admin, "TokenFactory: Caller not admin");
        template1155Address = _template;
    }

    /**
     * @notice Function to update the address of the marketplace contract for ERC1155
     * @param _marketplace is the new marketplace address for ERC1155
     */
    function updateMarketplace(address _marketplace) external {
        require(_marketplace != address(0), "Zero address sent");
        require(msg.sender == admin, "TokenFactory: Caller not admin");
        marketplace = _marketplace;
    }

    /**
     * @notice Function to update the admin of this contract
     * @param _newAdmin is the new admin address
     */
    function updateAdmin(address _newAdmin) external {
        require(_newAdmin != address(0), "Zero address sent");
        require(msg.sender == admin, "TokenFactory: Caller not admin");
        admin = _newAdmin;
    }

    /**
     * @notice Function to update the operators of this contract
     * @param _account is the operator's address
     * @param _status is the new status of the operator
     */
    function updateOperator(address _account, bool _status) external {
        require(msg.sender == admin, "not admin");
        require(_account != address(0), "Zero address sent");
        operators[_account] = _status;
    }

        /**
     * @notice Function to withdraw stuck tokens from the contract
     * @param _token is the token to be withdrawn
     * @param  isMatic is to check if matic needed to withdrawn
     */
    function withdrawStuckToken(address _token, bool isMatic) external {
        uint256 _amount;
        if(isMatic) {
            _amount = address(this).balance;
            (bool success,) = admin.call{value : _amount}("");
            // not successfull
            require(success,"NS");
        } else {
            _amount = IERC20Upgradeable(_token).balanceOf(address(this));
            IERC20Upgradeable(_token).transfer(admin, _amount);
        }
        emit TokenWithdrawn(_amount);
    }
}
