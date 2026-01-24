import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("EmergencyPause Unit Tests", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await deployDAOFixture();
  });

  describe("Access Control", function () {
    it("Should allow multisig to pause", async function () {
      const { pause, multisig } = fixture;
      await expect(pause.connect(multisig).pause())
        .to.emit(pause, "Paused")
        .withArgs(multisig.address);
      expect(await pause.paused()).to.be.true;
    });

    it("Should fail if non-multisig tries to pause", async function () {
      const { pause, attacker } = fixture;
      await expect(pause.connect(attacker).pause())
        .to.be.revertedWithCustomError(pause, "AccessControlUnauthorizedAccount");
    });

    it("Should allow multisig to unpause", async function () {
      const { pause, multisig } = fixture;
      await pause.connect(multisig).pause();
      await expect(pause.connect(multisig).unpause())
        .to.emit(pause, "Unpaused")
        .withArgs(multisig.address);
      expect(await pause.paused()).to.be.false;
    });
  });

  describe("State Validity", function () {
    it("Should revert if already paused", async function () {
      const { pause, multisig } = fixture;
      await pause.connect(multisig).pause();
      await expect(pause.connect(multisig).pause())
        .to.be.revertedWithCustomError(pause, "AlreadyPaused");
    });

    it("Should revert if unpausing when not paused", async function () {
      const { pause, multisig } = fixture;
      await expect(pause.connect(multisig).unpause())
        .to.be.revertedWithCustomError(pause, "NotPaused");
    });
  });
});
