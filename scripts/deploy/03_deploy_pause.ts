import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EmergencyPause with account:", deployer.address);

  const multisigAddress = process.env.MULTISIG_ADDRESS || deployer.address;

  const EmergencyPause = await ethers.getContractFactory("EmergencyPause");
  const pause = await EmergencyPause.deploy(multisigAddress);
  await pause.waitForDeployment();

  const address = await pause.getAddress();
  console.log("EmergencyPause deployed to:", address);

  const deploymentPath = path.join(__dirname, "../../deployments.json");
  let deployments: any = {};
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }
  deployments.EmergencyPause = address;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
