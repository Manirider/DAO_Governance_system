import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { deployDAOFixture } from "../helpers/fixtures.js";

describe("GOVToken Unit Tests", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await deployDAOFixture();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      const { token } = fixture;
      expect(await token.name()).to.equal("Governance Token");
      expect(await token.symbol()).to.equal("GOV");
    });

    it("Should mint initial supply to deployer", async function () {
      const { token, deployer } = fixture;
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));

      const deployerBalance = await token.balanceOf(deployer.address);
      expect(deployerBalance).to.equal(ethers.parseEther("997000"));
    });
  });

  describe("Delegation", function () {
    it("Should update votes on delegation", async function () {
      const { token, voter1, voter2 } = fixture;

      await token.connect(voter1).delegate(voter2.address);

      const votes1 = await token.getVotes(voter1.address);
      const votes2 = await token.getVotes(voter2.address);

      expect(votes1).to.equal(0);
      expect(votes2).to.equal(ethers.parseEther("2000"));
    });

    it("Should track historical votes", async function () {
      const { token, voter1 } = fixture;

      const blockNumBefore = await ethers.provider.getBlockNumber();
      await token.connect(voter1).transfer(ethers.Wallet.createRandom().address, 1);
      const blockNumAfter = await ethers.provider.getBlockNumber();

      const votes = await token.getPastVotes(voter1.address, blockNumBefore);
      expect(votes).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Transfers", function () {
    it("Should move voting power on transfer", async function () {
      const { token, voter1, voter2 } = fixture;

      await token.connect(voter1).transfer(voter2.address, ethers.parseEther("500"));

      const votes1 = await token.getVotes(voter1.address);
      const votes2 = await token.getVotes(voter2.address);

      expect(votes1).to.equal(ethers.parseEther("500"));
      expect(votes2).to.equal(ethers.parseEther("1500"));
    });
  });
});
