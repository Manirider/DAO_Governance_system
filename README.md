# DAO_Governance_system

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![License](https://img.shields.io/github/license/Manirider/DAO_Governance_system?style=flat-square) ![Last Commit](https://img.shields.io/github/last-commit/Manirider/DAO_Governance_system?style=flat-square) ![Issues](https://img.shields.io/github/issues/Manirider/DAO_Governance_system?style=flat-square)

`portfolio-project`

## Project Overview

A smart contract suite managing decentralized autonomous organization structures. The contracts coordinate voter registration, proposal generation, on-chain voting, and execution timelocks.

## Core Features

- Solidity contracts managing proposals, votes, and execution windows.
- ERC20 governance token support calculating member voting weights.
- Hardhat scripts deploying contracts and setting up test tokens.
- Testing modules verifying proposal statuses and double-voting blocks.
- Role-based access configurations securing timelock execution.

## Technical Flow & Execution

Members submit proposals to the DAO. Voters cast token-weighted votes during the active window. Passed proposals are queued in the timelock for execution.

## Getting Started

### Requirements

- Node.js version 18 or above
- Npm or Yarn package manager

### Environment Configuration

```bash
# Clone this repository
git clone https://github.com/Manirider/DAO_Governance_system.git
cd DAO_Governance_system

# Install packages
npm install
```

### Execution

```bash
# Start the local development server
npm run dev

# Run target tests
npm run test
```

## Directory Layout

```
DAO_Governance_system/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
└── (source files)
```

## Contributing to the Project

I welcome issues and pull requests to make this project better. Please see the detailed guidelines in the [Contributing Guide](CONTRIBUTING.md).

## Project License

This repository is distributed under the MIT License. For complete terms, see the [LICENSE](LICENSE) file.

Developed by [S. Manikanta Suryasai](https://github.com/Manirider)
