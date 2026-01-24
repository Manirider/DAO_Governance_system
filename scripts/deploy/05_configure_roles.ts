import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Configuring Timelock Roles...");

  const deploymentPath = path.join(__dirname, "../../deployments.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployments.json not found.");
  }
  const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const timelockAddress = deployments.DAOTimelock;
  const governorAddress = deployments.DAOGovernor;

  const timelock = await ethers.getContractAt("DAOTimelock", timelockAddress);

  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  console.log("Granting PROPOSER_ROLE to Governor...");
  let tx = await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  await tx.wait();

  console.log("Granting EXECUTOR_ROLE to Zero Address (Open Execution)...");
  tx = await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  await tx.wait();

  console.log("Revoking DEFAULT_ADMIN_ROLE from deployer...");
  tx = await timelock.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address);
  await tx.wait();

  console.log("Roles configured successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
