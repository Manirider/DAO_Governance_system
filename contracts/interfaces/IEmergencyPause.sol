// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEmergencyPause {
    function paused() external view returns (bool);

    function pause() external;

    function unpause() external;

    event Paused(address indexed account);
    event Unpaused(address indexed account);
}
