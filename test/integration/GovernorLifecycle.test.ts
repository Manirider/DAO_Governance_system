import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("Governor Lifecycle Integration", function () {
  let fixture: any;

  const mine = async (blocks: number | bigint) => {
    for (let i = 0; i < Number(blocks); i++) {
      await ethers.provider.send("evm_mine", []);
    }
  };

  const increaseTime = async (seconds: number | bigint) => {
    await ethers.provider.send("evm_increaseTime", [Number(seconds)]);
    await ethers.provider.send("evm_mine", []);
  };

  beforeEach(async function () {
    fixture = await deployDAOFixture();
  });

  it("Should execute a proposal end-to-end", async function () {
    const { governor, timelock, token, voter1, voter2, treasury } = fixture;

    await voter1.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5.0")
    });

    const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
    const initialVoter2Balance = await ethers.provider.getBalance(voter2.address);

    const transferAmount = ethers.parseEther("1.0");
    const targets = [await treasury.getAddress()];
    const values = [0];
    const calldatas = [
      treasury.interface.encodeFunctionData("withdrawETH", [voter2.address, transferAmount])
    ];
    const description = "Proposal #1: Withdraw 1 ETH";

    const tx = await governor.connect(voter1).propose(targets, values, calldatas, description);
    const receipt = await tx.wait();

    const event = (receipt.logs as any[]).find((log: any) => log.fragment && log.fragment.name === "ProposalCreated");
    const proposalId = event.args[0];

    await mine(2);

    await governor.connect(voter1).castVote(proposalId, 1);
    await governor.connect(voter2).castVote(proposalId, 1);

    const votingPeriod = await governor.votingPeriod();
    await mine(votingPeriod + 1n);

    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    await governor.connect(voter1).queue(targets, values, calldatas, descriptionHash);

    const minDelay = await timelock.getMinDelay();
    await increaseTime(minDelay + 1);

    await governor.connect(voter1).execute(targets, values, calldatas, descriptionHash);

    const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
    const finalVoter2Balance = await ethers.provider.getBalance(voter2.address);

    expect(finalTreasuryBalance).to.equal(initialTreasuryBalance - transferAmount);
    expect(finalVoter2Balance).to.equal(initialVoter2Balance + transferAmount);

    const state = await governor.state(proposalId);
    expect(state).to.equal(7);
  });
});
