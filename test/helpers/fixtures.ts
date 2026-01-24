import hre from "hardhat";
const { ethers } = hre;

export async function deployDAOFixture() {
  const [deployer, voter1, voter2, voter3, attacker, multisig] = await ethers.getSigners();

  const GOVToken = await ethers.getContractFactory("GOVToken");
  const token = await GOVToken.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();

  const DAOTimelock = await ethers.getContractFactory("DAOTimelock");
  const minDelay = 3600;
  const timelock = await DAOTimelock.deploy(minDelay, [], [], deployer.address);
  await timelock.waitForDeployment();

  const EmergencyPause = await ethers.getContractFactory("EmergencyPause");
  const pause = await EmergencyPause.deploy(multisig.address);
  await pause.waitForDeployment();

  const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
  const votingDelay = 1;
  const votingPeriod = 50;
  const proposalThreshold = ethers.parseEther("1");
  const attester = deployer;

  const governor = await DAOGovernor.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    attester.address,
    await pause.getAddress(),
    votingDelay,
    votingPeriod,
    proposalThreshold
  );
  await governor.waitForDeployment();

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(await timelock.getAddress());
  await treasury.waitForDeployment();

  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  await timelock.grantRole(PROPOSER_ROLE, await governor.getAddress());
  await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  await timelock.revokeRole(ADMIN_ROLE, deployer.address);

  await token.transfer(voter1.address, ethers.parseEther("1000"));
  await token.transfer(voter2.address, ethers.parseEther("1000"));
  await token.transfer(voter3.address, ethers.parseEther("1000"));

  await token.connect(voter1).delegate(voter1.address);
  await token.connect(voter2).delegate(voter2.address);
  await token.connect(voter3).delegate(voter3.address);

  return {
    deployer,
    voter1,
    voter2,
    voter3,
    attacker,
    multisig,
    token,
    timelock,
    governor,
    pause,
    treasury,
    attester
  };
}
