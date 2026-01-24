import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying DAOGovernor with account:", deployer.address);

    const deploymentPath = path.join(__dirname, "../../deployments.json");
    if (!fs.existsSync(deploymentPath)) {
        throw new Error("deployments.json not found. Run previous deploy scripts first.");
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const tokenAddress = deployments.GOVToken;
    const timelockAddress = deployments.DAOTimelock;
    const pauseAddress = deployments.EmergencyPause;
    const attesterAddress = process.env.ATTESTER_ADDRESS || deployer.address;

    const votingDelay = 1;
    const votingPeriod = 50400;
    const proposalThreshold = ethers.parseEther("1");

    const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
    const governor = await DAOGovernor.deploy(
        tokenAddress,
        timelockAddress,
        attesterAddress,
        pauseAddress,
        votingDelay,
        votingPeriod,
        proposalThreshold
    );
    await governor.waitForDeployment();

    const address = await governor.getAddress();
    console.log("DAOGovernor deployed to:", address);

    deployments.DAOGovernor = address;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
