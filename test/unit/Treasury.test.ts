import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("Treasury Unit Tests", function () {
    let fixture: any;

    beforeEach(async function () {
        fixture = await deployDAOFixture();
    });

    describe("Ownership", function () {
        it("Should be owned by Timelock", async function () {
            const { treasury, timelock } = fixture;
            expect(await treasury.owner()).to.equal(await timelock.getAddress());
        });
    });

    describe("Deposits", function () {
        it("Should accept ETH", async function () {
            const { treasury, deployer } = fixture;
            await deployer.sendTransaction({
                to: await treasury.getAddress(),
                value: ethers.parseEther("1.0")
            });
            expect(await treasury.getETHBalance()).to.equal(ethers.parseEther("1.0"));
        });
    });

    describe("Restricted Access", function () {
        it("Should fail if non-owner tries to withdraw ETH", async function () {
            const { treasury, attacker } = fixture;
            await expect(
                treasury.connect(attacker).withdrawETH(attacker.address, 100)
            ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
        });

        it("Should fail if non-owner tries to withdraw Tokens", async function () {
            const { treasury, attacker, token } = fixture;
            await expect(
                treasury.connect(attacker).withdrawToken(await token.getAddress(), attacker.address, 100)
            ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
        });
    });
});
