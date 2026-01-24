import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("DAOTimelock Unit Tests", function () {
    let fixture: any;

    beforeEach(async function () {
        fixture = await deployDAOFixture();
    });

    describe("Roles", function () {
        it("Should have Governor as Proposer", async function () {
            const { timelock, governor } = fixture;
            const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
            expect(await timelock.hasRole(PROPOSER_ROLE, await governor.getAddress())).to.be.true;
        });

        it("Should have Open Execution", async function () {
            const { timelock } = fixture;
            const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
            expect(await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)).to.be.true;
        });

        it("Should not have Deployer as Admin", async function () {
            const { timelock, deployer } = fixture;
            const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
            expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.false;
        });
    });

    describe("Configuration", function () {
        it("Should have correct minimum delay", async function () {
            const { timelock } = fixture;
            expect(await timelock.getMinDelay()).to.equal(3600);
        });
    });
});
