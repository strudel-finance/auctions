pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
  constructor(
    string memory name,
    string memory symbol,
    uint256 supply
  ) ERC20(name, symbol) public {
    _mint(msg.sender, supply);
  }

  function mint(uint256 amount) public returns (bool) {
    _mint(msg.sender, amount);
  }

  function burn(uint256 amount) public{
    _burn(msg.sender, amount);
  }

  function mint(address recipient, uint256 amount) public returns (bool) {
    _mint(recipient, amount);
  }

}