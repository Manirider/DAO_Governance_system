import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying GOVToken with account:", deployer.address);

    const initialSupply = ethers.parseEther("1000000");
    const GOVToken = await ethers.getContractFactory("GOVToken");
    const token = await GOVToken.deploy(initialSupply);
    await token.waitForDeployment();

    const address = await token.getAddress();
    console.log("GOVToken deployed to:", address);

    const deploymentPath = path.join(__dirname, "../../deployments.json");
    let deployments: any = {};
    if (fs.existsSync(deploymentPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    }
    deployments.GOVToken = address;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
