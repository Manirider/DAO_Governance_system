// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract EmergencyPause is AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bool private _paused;

    event Paused(address indexed account);
    event Unpaused(address indexed account);

    error AlreadyPaused();
    error NotPaused();

    constructor(address multisig) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, multisig);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function paused() external view returns (bool) {
        return _paused;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        if (_paused) revert AlreadyPaused();
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        if (!_paused) revert NotPaused();
        _paused = false;
        emit Unpaused(msg.sender);
    }
}
