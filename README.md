# DAO Governance System

A complete, production-ready decentralized governance solution built on Ethereum. This system enables organizations to manage funds, vote on proposals, and execute decisions trustlessly through smart contracts.

## Why This Project?

Decentralized Autonomous Organizations (DAOs) need robust governance infrastructure. Most existing solutions are either too simple (lacking security features) or too complex (difficult to audit and maintain).

This project strikes a balance—it provides enterprise-grade security using battle-tested OpenZeppelin contracts while remaining straightforward enough for any developer to understand, deploy, and customize.

**What makes this different:**
- Built entirely on OpenZeppelin's Governor framework (the same foundation used by major protocols)
- Emergency pause mechanism controlled by a separate multisig (not by the DAO itself)
- Support for off-chain voting via Snapshot-style attestation
- Comprehensive test coverage and documentation

## How It Works

The system consists of five core contracts that work together:

### 1. GOVToken — The Voting Power

An ERC-20 token that tracks voting power. Token holders can delegate their votes to themselves or others. The contract maintains historical snapshots so votes are counted at proposal creation time (preventing flash loan attacks).

### 2. DAOGovernor — The Decision Maker

The central governance contract. It handles the entire proposal lifecycle:
- **Propose** → Anyone with enough tokens can create a proposal
- **Vote** → Token holders cast their votes (For, Against, Abstain)
- **Queue** → Successful proposals are queued in the Timelock
- **Execute** → After the delay, anyone can trigger execution

### 3. DAOTimelock — The Safety Net

All approved proposals must wait in the Timelock before execution. This delay (typically 24-48 hours) gives the community time to react if something malicious slips through.

### 4. EmergencyPause — The Circuit Breaker

A completely separate contract controlled by a trusted multisig. If governance is compromised or a vulnerability is discovered, the multisig can freeze all governance operations instantly. Critically, the DAO *cannot* control this contract—it's designed to be independent.

### 5. Treasury — The Vault

Holds ETH and ERC-20 tokens belonging to the DAO. All withdrawals require a successful governance vote followed by the Timelock delay.

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash

# Install dependencies
npm install

# Create environment file (optional for local testing)
cp .env.example .env

### Compile the Contracts

```bash
npx hardhat compile
```

### Run the Verification Script

The fastest way to see everything working:

```bash

npx hardhat node

npx tsx scripts/verify.ts
```

This script deploys all contracts, creates a proposal to withdraw ETH from the Treasury, votes on it, waits for the timelock, and executes it—demonstrating the complete governance flow.

## Running Tests

```bash

npx hardhat test


npx hardhat node 
npx tsx scripts/verify.ts
```

## Docker

For a reproducible environment:

```bash
docker-compose up --build
```

This builds the project in an isolated container and runs the test suite.

## Contract Configuration

### GOVToken
| Parameter | Value |
|-----------|-------|
| Name | Governance Token |
| Symbol | GOV |
| Initial Supply | 1,000,000 tokens |

### DAOGovernor
| Parameter | Value |
|-----------|-------|
| Voting Delay | 1 block |
| Voting Period | 50 blocks (testnet) / ~1 week (mainnet) |
| Proposal Threshold | 1 token |
| Quorum | 4% of total supply |

### DAOTimelock
| Parameter | Value |
|-----------|-------|
| Minimum Delay | 3600 seconds (1 hour) |


## Deployment

Deploy contracts in sequence:

```bash
npx hardhat run scripts/deploy/01_deploy_token.ts
npx hardhat run scripts/deploy/02_deploy_timelock.ts
npx hardhat run scripts/deploy/03_deploy_pause.ts
npx hardhat run scripts/deploy/04_deploy_governor.ts
npx hardhat run scripts/deploy/05_configure_roles.ts
```

The final script configures the Timelock to accept proposals only from the Governor and removes all admin access from the deployer.


## Security Model

### Access Control

| Role | Who Has It | What They Can Do |
|------|-----------|------------------|
| Token Holder | Anyone with GOV tokens | Delegate votes, vote on proposals |
| Proposer | Governor contract only | Submit proposals to Timelock |
| Executor | Anyone (open execution) | Execute proposals after delay |
| Pauser | Emergency multisig | Pause/unpause governance |

### Key Security Features

1. **Timelock Protection** — Every approved proposal must wait before execution, giving the community time to react.

2. **Reentrancy Guards** — Execution paths use `nonReentrant` modifiers.

3. **Independent Emergency Control** — The EmergencyPause contract cannot be governed by the DAO itself. Even if governance is compromised, the multisig can freeze operations.

4. **No Admin Backdoors** — After deployment, all admin roles are revoked. The deployer has no special privileges.

5. **SafeERC20** — Token transfers use OpenZeppelin's SafeERC20 to handle non-standard tokens correctly.


## Off-Chain Voting

The system supports hybrid governance. An authorized "attester" can submit off-chain vote results (from Snapshot, for example) to the Governor contract. This allows gasless voting while maintaining on-chain execution security.

The attester is set at deployment and cannot be changed. In production, this should be a multisig or an oracle service that validates Snapshot IPFS hashes.

## Project Structure

contracts/
├── core/
│   ├── GOVToken.sol        # Governance token
│   ├── DAOGovernor.sol     # Main governance logic
│   └── DAOTimelock.sol     # Execution delay
├── security/
│   └── EmergencyPause.sol  # Circuit breaker
├── treasury/
│   └── Treasury.sol        # Fund management
└── interfaces/
    └── IEmergencyPause.sol # Interface for pause checks

scripts/
├── deploy/                 # Deployment scripts (run in order)
├── verify.ts               # End-to-end verification
└── gas-report.ts           # Gas profiling

test/
├── unit/                   # Individual contract tests
├── integration/            # Full flow tests
└── helpers/
    └── fixtures.ts         # Test setup


## Gas Costs

| Operation | Gas |
|-----------|-----|
| Deploy all contracts | ~8,500,000 |
| Create proposal | ~81,000 |
| Cast vote | ~83,000 |
| Queue proposal | ~148,000 |
| Execute proposal | ~111,000 |

At 30 gwei, full deployment costs approximately 0.25 ETH.


## Contributing

Contributions are welcome. Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License
MIT

## Author
Manikanta Suryasai

Blockchain developer | Ai engineer

## Acknowledgments

Built with [OpenZeppelin Contracts](https://openzeppelin.com/contracts/) and [Hardhat](https://hardhat.org/).
