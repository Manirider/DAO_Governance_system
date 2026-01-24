import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log("=".repeat(60));
    console.log("         DAO GOVERNANCE VERIFICATION SCRIPT");
    console.log("=".repeat(60));
    console.log("\nConnecting to local Hardhat node...\n");

    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    // Get signers from the provider (Hardhat funded accounts)
    const deployerSigner = await provider.getSigner(0);
    const voter1Signer = await provider.getSigner(1);
    const voter2Signer = await provider.getSigner(2);

    console.log(`Deployer: ${await deployerSigner.getAddress()}`);
    console.log(`Voter1:   ${await voter1Signer.getAddress()}`);
    console.log(`Voter2:   ${await voter2Signer.getAddress()}`);

    // Load artifacts
    const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");

    function loadArtifact(contractPath: string, name: string) {
        const artifactPath = path.join(artifactsDir, contractPath, `${name}.json`);
        return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    }

    const artifacts = {
        GOVToken: loadArtifact("core/GOVToken.sol", "GOVToken"),
        DAOTimelock: loadArtifact("core/DAOTimelock.sol", "DAOTimelock"),
        EmergencyPause: loadArtifact("security/EmergencyPause.sol", "EmergencyPause"),
        DAOGovernor: loadArtifact("core/DAOGovernor.sol", "DAOGovernor"),
        Treasury: loadArtifact("treasury/Treasury.sol", "Treasury"),
    };

    async function deploy(artifact: any, args: any[], signer: ethers.Signer): Promise<ethers.Contract> {
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
        const contract = await factory.deploy(...args);
        await contract.waitForDeployment();
        return contract as ethers.Contract;
    }


    console.log("\n1. Deploying GOVToken...");
    const token = await deploy(artifacts.GOVToken, [ethers.parseEther("1000000")], deployerSigner);
    const tokenAddr = await token.getAddress();
    console.log(`   ✓ Token deployed: ${tokenAddr}`);

    console.log("\n2. Deploying DAOTimelock...");
    const deployerAddr = await deployerSigner.getAddress();
    const timelock = await deploy(artifacts.DAOTimelock, [3600, [], [], deployerAddr], deployerSigner);
    const timelockAddr = await timelock.getAddress();
    console.log(`   ✓ Timelock deployed: ${timelockAddr}`);

    console.log("\n3. Deploying EmergencyPause...");
    const pause = await deploy(artifacts.EmergencyPause, [deployerAddr], deployerSigner);
    const pauseAddr = await pause.getAddress();
    console.log(`   ✓ EmergencyPause deployed: ${pauseAddr}`);

    console.log("\n4. Deploying DAOGovernor...");
    const governor = await deploy(artifacts.DAOGovernor, [
        tokenAddr,
        timelockAddr,
        deployerAddr,
        pauseAddr,
        1,
        100,
        ethers.parseEther("1")
    ], deployerSigner);
    const governorAddr = await governor.getAddress();
    console.log(`   ✓ DAOGovernor deployed: ${governorAddr}`);

    console.log("\n5. Deploying Treasury...");
    const treasury = await deploy(artifacts.Treasury, [timelockAddr], deployerSigner);
    const treasuryAddr = await treasury.getAddress();
    console.log(`   ✓ Treasury deployed: ${treasuryAddr}`);

    console.log("\n6. Configuring Timelock roles...");
    const timelockContract = new ethers.Contract(timelockAddr, artifacts.DAOTimelock.abi, deployerSigner);
    const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelockContract.EXECUTOR_ROLE();
    const ADMIN_ROLE = await timelockContract.DEFAULT_ADMIN_ROLE();

    let tx = await timelockContract.grantRole(PROPOSER_ROLE, governorAddr);
    await tx.wait();
    tx = await timelockContract.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    await tx.wait();
    tx = await timelockContract.revokeRole(ADMIN_ROLE, deployerAddr);
    await tx.wait();
    console.log("   ✓ Roles configured (Governor=Proposer, Open Executor)");

    console.log("\n7. Distributing tokens and delegating...");
    const tokenContract = new ethers.Contract(tokenAddr, artifacts.GOVToken.abi, deployerSigner);
    const voter1Addr = await voter1Signer.getAddress();

    tx = await tokenContract.transfer(voter1Addr, ethers.parseEther("100000"));
    await tx.wait();

    const tokenVoter1 = new ethers.Contract(tokenAddr, artifacts.GOVToken.abi, voter1Signer);
    tx = await tokenVoter1.delegate(voter1Addr);
    await tx.wait();

    await provider.send("evm_mine", []);

    console.log(`   ✓ Voter1 has 100,000 GOV tokens (delegated to self)`);

    console.log("\n8. Funding Treasury...");
    tx = await deployerSigner.sendTransaction({ to: treasuryAddr, value: ethers.parseEther("10.0") });
    await tx.wait();
    const treasuryBal = await provider.getBalance(treasuryAddr);
    console.log(`   ✓ Treasury balance: ${ethers.formatEther(treasuryBal)} ETH`);

    console.log("\n9. Creating Proposal (Withdraw 1 ETH to Voter2)...");
    const voter2Addr = await voter2Signer.getAddress();
    const transferAmount = ethers.parseEther("1.0");
    const treasuryContract = new ethers.Contract(treasuryAddr, artifacts.Treasury.abi, deployerSigner);
    const calldata = treasuryContract.interface.encodeFunctionData("withdrawETH", [voter2Addr, transferAmount]);

    const governorVoter1 = new ethers.Contract(governorAddr, artifacts.DAOGovernor.abi, voter1Signer);
    tx = await governorVoter1.propose([treasuryAddr], [0], [calldata], "Withdraw 1 ETH to Voter2");
    const receipt = await tx.wait();

    const proposalCreatedEvent = receipt.logs.find((log: any) => {
        try {
            const parsed = governorVoter1.interface.parseLog(log);
            return parsed?.name === "ProposalCreated";
        } catch { return false; }
    });
    const proposalId = governorVoter1.interface.parseLog(proposalCreatedEvent)?.args[0];
    console.log(`   ✓ Proposal created (ID: ${proposalId.toString().slice(0, 20)}...)`);


    console.log("\n10. Advancing past voting delay...");
    await provider.send("evm_mine", []);
    await provider.send("evm_mine", []);
    console.log("   ✓ Voting is now active");

    console.log("\n11. Casting vote (FOR)...");
    tx = await governorVoter1.castVote(proposalId, 1);
    await tx.wait();
    console.log("   ✓ Vote cast successfully");


    console.log("\n12. Advancing 100 blocks to end voting period...");
    for (let i = 0; i < 105; i++) {
        await provider.send("evm_mine", []);
    }
    console.log("   ✓ Voting period ended");


    console.log("\n13. Queuing proposal in Timelock...");
    const descHash = ethers.keccak256(ethers.toUtf8Bytes("Withdraw 1 ETH to Voter2"));
    tx = await governorVoter1.queue([treasuryAddr], [0], [calldata], descHash);
    await tx.wait();
    console.log("   ✓ Proposal queued");


    console.log("\n14. Fast-forwarding 1 hour (Timelock delay)...");
    await provider.send("evm_increaseTime", [3601]);
    await provider.send("evm_mine", []);
    console.log("   ✓ Timelock delay passed");

    console.log("\n15. Executing proposal...");
    const treasuryBalBefore = await treasuryContract.getETHBalance();
    const voter2BalBefore = await provider.getBalance(voter2Addr);

    tx = await governorVoter1.execute([treasuryAddr], [0], [calldata], descHash);
    await tx.wait();

    const treasuryBalAfter = await treasuryContract.getETHBalance();
    const voter2BalAfter = await provider.getBalance(voter2Addr);

    const treasuryDecrease = BigInt(treasuryBalBefore) - BigInt(treasuryBalAfter);
    const voter2Increase = BigInt(voter2BalAfter) - BigInt(voter2BalBefore);

    console.log(`   ✓ Proposal executed!`);
    console.log(`   ✓ Treasury decreased by: ${ethers.formatEther(treasuryDecrease)} ETH`);

    console.log("\n" + "=".repeat(60));
    if (treasuryDecrease === transferAmount) {
        console.log(`   Treasury decreased by ${ethers.formatEther(treasuryDecrease)} ETH as expected.`);
    } else {
        console.log("⚠️  Unexpected Results:");
        console.log(`   Treasury change: ${ethers.formatEther(treasuryDecrease)} ETH (expected: 1.0)`);
    }
    console.log("=".repeat(60));
}

main().catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
});
