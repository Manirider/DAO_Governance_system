# Architecture Guide

This document explains how the DAO Governance system is designed, why each component exists, and how they interact with each other
## Design Philosophy

We built this system with three principles in mind:

1. **Security through separation** — Different contracts handle different concerns. The Treasury doesn't know about voting. The Governor doesn't hold funds. This limits the blast radius of any single vulnerability.

2. **Defense in depth** — Even if governance is compromised, the Timelock delay gives the community time to react. Even if that fails, the Emergency Pause multisig can freeze everything.

3. **Minimal attack surface** — We use established OpenZeppelin contracts wherever possible rather than writing custom logic. Every line of custom code is a potential bug.



## System Overview

Here's how a proposal flows through the system:

Token Holder → Proposes → DAOGovernor
                              ↓
                         Voting Period
                              ↓
                      Quorum Reached?
                         /        \
                       No          Yes
                        ↓           ↓
                     Fails      Queue in Timelock
                                    ↓
                              Wait (1 hour+)
                                    ↓
                                Execute
                                    ↓
                           Target (Treasury, etc.)


## Contract Responsibilities

### GOVToken

**Purpose:** Track who has voting power and how much.

The token implements ERC20Votes from OpenZeppelin. This means:
- Voting power is tracked separately from token balance
- You must delegate (even to yourself) to activate voting power
- Historical snapshots prevent flash loan attacks
- Supports gasless delegation via signatures (ERC-2612)

**Important:** There's no mint function after deployment. The supply is fixed forever.

### DAOGovernor

**Purpose:** Manage the entire proposal lifecycle.

The Governor is the brain of the operation. It:
- Validates that proposers have enough tokens
- Counts votes and determines if quorum is met
- Coordinates with the Timelock for execution
- Checks the Emergency Pause state before sensitive operations

**Custom additions:**
- `notPaused` modifier on `propose()` and `execute()`
- `submitOffchainVoteResult()` for hybrid voting
- `ReentrancyGuard` on execution path

### DAOTimelock

**Purpose:** Delay execution of approved proposals.

Why do we need a delay? Consider this scenario:
1. Malicious proposal passes (maybe voters weren't paying attention)
2. Without a timelock, it executes immediately—funds are gone
3. With a timelock, the community has hours or days to:
   - Rally opposition
   - Activate the emergency pause
   - Prepare defensive measures

The Timelock is the owner of the Treasury and other system contracts. This means all administrative actions require governance approval.

### EmergencyPause

**Purpose:** Stop everything if something goes wrong.

This is deliberately simple—just a boolean flag and two functions (`pause` and `unpause`). A few critical design decisions:

1. **Not governable** — The DAO cannot vote to pause or unpause. Only the multisig can.
2. **No admin after deployment** — The deployer's admin role is revoked in the constructor.
3. **Cannot be upgraded** — No proxy pattern, no way to change the logic.

This isolation is intentional. If governance is compromised, the attacker controls the Governor. They should NOT be able to disable the emergency pause.

### Treasury

**Purpose:** Hold and manage DAO funds.

The Treasury accepts ETH and any ERC-20 token. Withdrawals require owner permission—and the owner is the Timelock, which means:

- Governance proposal
- Vote passes
- Timelock delay
- Then (and only then) funds can move

---

## Trust Boundaries

Understanding who can do what is critical for security:

| Actor | What They Control |
|-------|-------------------|
| Token Holders | Voting power, delegation |
| Governor Contract | Proposal lifecycle, queueing in Timelock |
| Timelock | Executing calls to Treasury and other contracts |
| Emergency Multisig | Pause/unpause governance |
| Attester | Off-chain vote attestation |

**Key insight:** The Timelock is the most privileged entity because it actually executes calls. But the Timelock only acts on instructions from the Governor, which only acts if votes pass. This creates a trust chain that's hard to subvert.


## Off-Chain Voting Flow

For gas-free voting (like Snapshot), the system works as follows:

1. Proposal created on-chain (establishes the proposal ID)
2. Voting happens off-chain (e.g., Snapshot)
3. Authorized attester verifies the off-chain results
4. Attester calls `submitOffchainVoteResult(proposalId, true)` on-chain
5. Governor treats the proposal as if it passed quorum
6. Normal queue → wait → execute flow continues

The off-chain voting doesn't bypass security—it just replaces the on-chain vote counting step.


## What About Upgrades?

This system is not upgradeable by design. Once deployed, the contract logic cannot change.

If you need to upgrade:
1. Deploy new contracts
2. Migrate funds via governance proposal
3. Have token holders re-delegate to the new system

This is more disruptive than proxy upgrades, but it's also more transparent and eliminates upgrade-related attack vectors.


## Failure Modes

We've designed the system to fail safely:

| Failure | What Happens |
|---------|--------------|
| Governance compromised | Emergency multisig pauses, stopping execution |
| Multisig keys lost | Governance continues normally (pause can't be activated) |
| Bug in Governor | Proposals stop, existing queued items can still execute |
| Bug in Treasury | Funds frozen until governance can migrate them |

The worst case—complete system compromise—still requires breaking multiple independent security layers.
