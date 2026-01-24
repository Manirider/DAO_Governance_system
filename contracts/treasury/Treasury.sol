// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    event ETHDeposited(address indexed sender, uint256 amount);
    event ETHWithdrawn(address indexed recipient, uint256 amount);
    event TokenWithdrawn(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    error InsufficientETHBalance(uint256 requested, uint256 available);
    error InsufficientTokenBalance(
        address token,
        uint256 requested,
        uint256 available
    );

    constructor(address _timelock) Ownable(_timelock) {}

    receive() external payable {
        emit ETHDeposited(msg.sender, msg.value);
    }

    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTokenBalance(IERC20 token) external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function withdrawETH(
        address payable recipient,
        uint256 amount
    ) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance < amount) {
            revert InsufficientETHBalance(amount, balance);
        }

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit ETHWithdrawn(recipient, amount);
    }

    function withdrawToken(
        IERC20 token,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) {
            revert InsufficientTokenBalance(address(token), amount, balance);
        }

        token.safeTransfer(recipient, amount);

        emit TokenWithdrawn(address(token), recipient, amount);
    }
}
