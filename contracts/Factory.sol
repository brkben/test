// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/INFTTemplate.sol";
import "./interfaces/ISFTTemplate.sol";
import "./Relayer/BasicMetaTransaction.sol";
import "./libraries/VoucherLib.sol";

contract TokenFactory is Initializable, BasicMetaTransaction {
    // Admin of the contract
    address public admin;

    // Template of ERC721
    address public template721Address;

    // Template of ERC1155
    address public template1155Address;

    // Marketplace address
    address public marketplace;

    // Counter to create unique salt
    uint256 public counter;

    // Mapping of last contract deployed by any address
    mapping(address => mapping(uint256 => address)) public userNFTContracts;

    // Mapping of the operator which have specific accesses
    mapping(address => bool) public operators;

    event ERC721Created(address indexed token, string name, string symbol);
    event ERC1155Created(address indexed token, string uri);

    /**
     * @dev Initializes the contract by setting a `template721Address`, `template1155Address` and `marketplace` for the contract
     * @param _template721Address is set as the template of ERC721 that will be redeployed using create721Token()
     * @param _template1155Address is set as the template of ERC1155 that will be redeployed using create1155Token()
     * @param _marketplace is set as the address of the marketplace contract
     */
    function initialize(
        address _template721Address,
        address _template1155Address,
        address _marketplace
    ) external initializer {
        admin = msg.sender;
        template721Address = _template721Address;
        template1155Address = _template1155Address;
        marketplace = _marketplace;
        operators[msg.sender] = true;
    }

    /**
     * @notice deploys a clone of the ERC721 template contracts using the openzeppelin clones contract
     * @param name is set as the name of the deployed ERC721
     * @param symbol is set as the symbol of the deployed ERC721
     * @param _admin is set as the admin of the deployed ERC721 which will be the creator itself
     * @param _creator is set as the admin of the deployed ERC1155 which will be the creator itself
     */
    function create721Token(
        string memory name,
        string memory symbol,
        address _admin,
        address _creator
    ) external returns (address token) {
        require(operators[msg.sender], "not operator");
        uint count = counter;
        bytes32 salt = keccak256(abi.encodePacked(count, name, _creator));
        token = ClonesUpgradeable.cloneDeterministic(template721Address, salt);
        userNFTContracts[msg.sender][count] = token;
        counter = count + 1;

        INFTTemplate(token).initialize(
            name,
            symbol,
            _admin,
            _creator,
            address(this)
        );

        emit ERC721Created(token, name, symbol);
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
    ) external returns (address token1155) {
        require(operators[msg.sender], "not operator");
        uint count = counter;
        bytes32 salt = keccak256(abi.encodePacked(count, uri, _creator));
        token1155 = ClonesUpgradeable.cloneDeterministic(
            template1155Address,
            salt
        );
        userNFTContracts[msg.sender][count] = token1155;
        counter = count + 1;

        ISFTTemplate(token1155).initialize(
            uri,
            _creator,
            _admin,
            address(this)
        );

        emit ERC1155Created(token1155, uri);
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}
     */
    function predictNFTContractAddress(
        string memory name,
        address implementation,
        address creator,
        uint256 index
    ) external view returns (address predicted) {
        bytes32 salt = keccak256(abi.encodePacked(index, name, creator));
        return
            ClonesUpgradeable.predictDeterministicAddress(
                implementation,
                salt,
                address(this)
            );
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
}
