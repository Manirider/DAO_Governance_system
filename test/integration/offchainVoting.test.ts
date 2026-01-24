import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("Off-chain Voting Integration", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await deployDAOFixture();
  });

  const mine = async (blocks: number | bigint) => {
    for (let i = 0; i < Number(blocks); i++) {
      await ethers.provider.send("evm_mine", []);
    }
  };

  it("Should allow attester to pass a proposal via off-chain result", async function () {
    const { governor, attester, voter1 } = fixture;

    const tx = await governor.connect(voter1).propose(
      [], [], [], "Offchain Proposal"
    );
    const receipt = await tx.wait();
    const event = (receipt.logs as any[]).find((log: any) => log.fragment && log.fragment.name === "ProposalCreated");
    const proposalId = event.args[0];

    await mine(2);

    await expect(governor.connect(attester).submitOffchainVoteResult(proposalId, true))
      .to.emit(governor, "OffchainVoteAttested")
      .withArgs(proposalId, true, attester.address);

    expect(await governor.state(proposalId)).to.equal(4);
  });

  it("Should reject attestation from non-attester", async function () {
    const { governor, attacker, voter1 } = fixture;

    const tx = await governor.connect(voter1).propose(
      [], [], [], "Offchain Proposal 2"
    );
    const receipt = await tx.wait();
    const event = (receipt.logs as any[]).find((log: any) => log.fragment && log.fragment.name === "ProposalCreated");
    const proposalId = event.args[0];

    await mine(2);

    await expect(
      governor.connect(attacker).submitOffchainVoteResult(proposalId, true)
    ).to.be.revertedWithCustomError(governor, "NotAuthorizedAttester");
  });
});
