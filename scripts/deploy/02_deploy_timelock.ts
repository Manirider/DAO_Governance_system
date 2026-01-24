import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DAOTimelock with account:", deployer.address);

  const minDelay = 3600;
  const DAOTimelock = await ethers.getContractFactory("DAOTimelock");
  const timelock = await DAOTimelock.deploy(minDelay, [], [], deployer.address);
  await timelock.waitForDeployment();

  const address = await timelock.getAddress();
  console.log("DAOTimelock deployed to:", address);

  const deploymentPath = path.join(__dirname, "../../deployments.json");
  let deployments: any = {};
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }
  deployments.DAOTimelock = address;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
