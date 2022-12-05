// SPDX-License-Identifier: MIT
pragma solidity =0.8.14;

interface IEvents {
   event ERC721Created(address indexed token, string name, string symbol);
   event ERC1155Created(address indexed token, string uri);
}