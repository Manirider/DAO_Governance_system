import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("EmergencyPause Integration", function () {
    let fixture: any;

    const mine = async (blocks: number | bigint) => {
        for (let i = 0; i < Number(blocks); i++) {
            await ethers.provider.send("evm_mine", []);
        }
    };

    beforeEach(async function () {
        fixture = await deployDAOFixture();
    });

    describe("Pause Blocks Proposal Creation", function () {
        it("Should revert propose() when paused", async function () {
            const { governor, pause, multisig, voter1 } = fixture;

            await pause.connect(multisig).pause();

            await expect(
                governor.connect(voter1).propose([], [], [], "Blocked Proposal")
            ).to.be.revertedWithCustomError(governor, "DAOPaused");
        });
    });

    describe("Pause Blocks Execution", function () {
        it("Should revert execute() when paused", async function () {
            const { governor, pause, multisig, voter1, treasury, timelock } = fixture;

            await voter1.sendTransaction({
                to: await treasury.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const targets = [await treasury.getAddress()];
            const values = [0];
            const calldatas = [
                treasury.interface.encodeFunctionData("withdrawETH", [voter1.address, ethers.parseEther("0.5")])
            ];
            const description = "Emergency Test Proposal";

            const tx = await governor.connect(voter1).propose(targets, values, calldatas, description);
            const receipt = await tx.wait();
            const event = (receipt.logs as any[]).find((log: any) => log.fragment && log.fragment.name === "ProposalCreated");
            const proposalId = event.args[0];

            await mine(2);
            await governor.connect(voter1).castVote(proposalId, 1);

            const votingPeriod = await governor.votingPeriod();
            await mine(votingPeriod + 1n);

            const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
            await governor.connect(voter1).queue(targets, values, calldatas, descriptionHash);

            const minDelay = await timelock.getMinDelay();
            await ethers.provider.send("evm_increaseTime", [Number(minDelay) + 1]);
            await ethers.provider.send("evm_mine", []);

            await pause.connect(multisig).pause();

            await expect(
                governor.connect(voter1).execute(targets, values, calldatas, descriptionHash)
            ).to.be.revertedWithCustomError(governor, "DAOPaused");
        });
    });

    describe("Unpause Restores Functionality", function () {
        it("Should allow propose() after unpause", async function () {
            const { governor, pause, multisig, voter1 } = fixture;

            await pause.connect(multisig).pause();
            await pause.connect(multisig).unpause();

            await expect(
                governor.connect(voter1).propose([], [], [], "Restored Proposal")
            ).to.emit(governor, "ProposalCreated");
        });
    });
});
