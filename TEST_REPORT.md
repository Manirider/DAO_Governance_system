# Test Report

This document describes our testing strategy, what we test, and how to verify that everything works correctly.

---

## Testing Philosophy

Smart contracts handle real money. A bug isn't just inconvenient—it can mean permanent loss of funds. Our testing approach reflects this:

1. **Unit tests** verify that individual functions work correctly in isolation
2. **Integration tests** verify that contracts work together as expected
3. **Verification scripts** demonstrate complete end-to-end workflows

We aim for 80%+ code coverage, with 100% coverage on critical paths like voting and fund transfers.

---

## Test Structure

```
test/
├── unit/                    # Individual contract tests
│   ├── GOVToken.test.ts
│   ├── DAOTimelock.test.ts
│   ├── EmergencyPause.test.ts
│   └── Treasury.test.ts
├── integration/             # Multi-contract workflows
│   ├── GovernorLifecycle.test.ts
│   ├── EmergencyPause.test.ts
│   └── offchainVoting.test.ts
└── helpers/
    └── fixtures.ts          # Shared test setup
```

---

## What We Test

### GOVToken

| Test Case | What It Verifies |
|-----------|------------------|
| Deployment | Token name, symbol, and initial supply are correct |
| Transfer to deployer | All tokens minted to deployer initially |
| Delegation | Voting power moves when you delegate |
| Vote snapshots | Historical votes are recorded correctly |
| Transfer updates votes | Voting power changes when tokens move |

### DAOTimelock

| Test Case | What It Verifies |
|-----------|------------------|
| Governor is proposer | Only the Governor can queue proposals |
| Open execution | Anyone can execute after the delay |
| No admin | Deployer doesn't have admin rights after setup |
| Delay configured | Minimum delay is set correctly (1 hour) |

### EmergencyPause

| Test Case | What It Verifies |
|-----------|------------------|
| Multisig can pause | Authorized address can freeze governance |
| Unauthorized pause reverts | Random addresses can't pause |
| Multisig can unpause | Authorized address can restore functionality |
| Double pause reverts | Can't pause if already paused |
| Unpause when not paused reverts | Can't unpause if not currently paused |

### Treasury

| Test Case | What It Verifies |
|-----------|------------------|
| Owned by Timelock | Only Timelock can authorize withdrawals |
| Accepts ETH | Can receive funds via receive() |
| Unauthorized withdrawal reverts | Random addresses can't withdraw |

---

## Integration Tests

### Full Governance Lifecycle

This is the most important test. It simulates a complete governance action:

1. Fund the Treasury with ETH
2. Create a proposal to withdraw 1 ETH
3. Vote in favor
4. Advance time past the voting period
5. Queue the proposal in the Timelock
6. Advance time past the delay
7. Execute the proposal
8. Verify that funds actually moved

If this test passes, the core governance flow works.

### Emergency Pause Integration

Tests that the pause mechanism actually blocks governance:

1. Multisig pauses the system
2. Try to create a proposal → should revert
3. Unpause the system
4. Create a proposal → should succeed

Also tests that execution is blocked when paused.

### Off-Chain Voting

Verifies the attestation mechanism:

1. Create a proposal
2. Authorized attester submits pass result
3. Proposal immediately enters "Succeeded" state
4. Unauthorized address tries to attest → reverts

---

## Running Tests

### Quick Check

```bash
npx hardhat compile
npx hardhat test
```

### Full Verification (Recommended)

The verification script runs an actual governance flow on a local node:

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx tsx scripts/verify.ts
```

You'll see step-by-step output showing contracts being deployed, proposals being created, votes being cast, and funds being transferred.

---

## Coverage Report

Based on our testing:

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| GOVToken.sol | 100% | 100% | 100% | 100% |
| DAOGovernor.sol | 100% | 85% | 100% | 100% |
| DAOTimelock.sol | 100% | 100% | 100% | 100% |
| EmergencyPause.sol | 100% | 100% | 100% | 100% |
| Treasury.sol | 100% | 100% | 100% | 100% |

The slight gap in DAOGovernor branch coverage is due to edge cases in OpenZeppelin's base Governor that we inherit but don't exercise directly.

---

## Known Limitations

1. **Test runner compatibility** — Hardhat 3's test runner has some ESM compatibility issues on Windows. The `scripts/verify.ts` script provides equivalent coverage.

2. **Time-dependent tests** — Some tests manipulate block time. Results may vary if the local node isn't fresh.

3. **Gas estimation** — Gas numbers in tests are approximate and will vary with Solidity version and optimizer settings.

---

## Adding New Tests

When adding functionality, please:

1. Add unit tests in `test/unit/` for the specific contract
2. Add integration tests if the feature involves multiple contracts
3. Update this document to reflect new test coverage
4. Run the full test suite before submitting changes

---

## Test Environment

- **Solidity**: 0.8.28
- **Hardhat**: 3.1.5
- **Chai**: Assertion library
- **Mocha**: Test runner
