import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface GasResult {
    operation: string;
    gasUsed: bigint;
    gasPrice?: string;
}

async function main() {
    console.log("=".repeat(60));
    console.log("         DAO GOVERNANCE GAS PROFILER");
    console.log("=".repeat(60));

    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const results: GasResult[] = [];

    const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
    function loadArtifact(contractPath: string, name: string) {
        return JSON.parse(fs.readFileSync(
            path.join(artifactsDir, contractPath, `${name}.json`), "utf8"
        ));
    }

    const artifacts = {
        GOVToken: loadArtifact("core/GOVToken.sol", "GOVToken"),
        DAOTimelock: loadArtifact("core/DAOTimelock.sol", "DAOTimelock"),
        EmergencyPause: loadArtifact("security/EmergencyPause.sol", "EmergencyPause"),
        DAOGovernor: loadArtifact("core/DAOGovernor.sol", "DAOGovernor"),
        Treasury: loadArtifact("treasury/Treasury.sol", "Treasury"),
    };

    const deployer = await provider.getSigner(0);
    const voter1 = await provider.getSigner(1);
    const voter2 = await provider.getSigner(2);
    const deployerAddr = await deployer.getAddress();
    const voter1Addr = await voter1.getAddress();
    const voter2Addr = await voter2.getAddress();

    async function deploy(artifact: any, args: any[], signer: ethers.Signer): Promise<[ethers.Contract, bigint]> {
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
        const tx = await factory.getDeployTransaction(...args);
        const estimatedGas = await provider.estimateGas({ ...tx, from: await signer.getAddress() });
        const contract = await factory.deploy(...args);
        await contract.waitForDeployment();
        return [contract as ethers.Contract, estimatedGas];
    }

    console.log("\n📊 DEPLOYMENT GAS COSTS\n");

    // Deploy Token
    const [token, tokenGas] = await deploy(artifacts.GOVToken, [ethers.parseEther("1000000")], deployer);
    const tokenAddr = await token.getAddress();
    results.push({ operation: "Deploy GOVToken", gasUsed: tokenGas });
    console.log(`  GOVToken:        ${tokenGas.toLocaleString()} gas`);

    // Deploy Timelock
    const [timelock, timelockGas] = await deploy(artifacts.DAOTimelock, [3600, [], [], deployerAddr], deployer);
    const timelockAddr = await timelock.getAddress();
    results.push({ operation: "Deploy DAOTimelock", gasUsed: timelockGas });
    console.log(`  DAOTimelock:     ${timelockGas.toLocaleString()} gas`);

    // Deploy Pause
    const [pause, pauseGas] = await deploy(artifacts.EmergencyPause, [deployerAddr], deployer);
    const pauseAddr = await pause.getAddress();
    results.push({ operation: "Deploy EmergencyPause", gasUsed: pauseGas });
    console.log(`  EmergencyPause:  ${pauseGas.toLocaleString()} gas`);

    // Deploy Governor
    const [governor, govGas] = await deploy(artifacts.DAOGovernor, [
        tokenAddr, timelockAddr, deployerAddr, pauseAddr, 1, 100, ethers.parseEther("1")
    ], deployer);
    const govAddr = await governor.getAddress();
    results.push({ operation: "Deploy DAOGovernor", gasUsed: govGas });
    console.log(`  DAOGovernor:     ${govGas.toLocaleString()} gas`);

    // Deploy Treasury
    const [treasury, treasuryGas] = await deploy(artifacts.Treasury, [timelockAddr], deployer);
    const treasuryAddr = await treasury.getAddress();
    results.push({ operation: "Deploy Treasury", gasUsed: treasuryGas });
    console.log(`  Treasury:        ${treasuryGas.toLocaleString()} gas`);

    // Setup roles
    const timelockC = new ethers.Contract(timelockAddr, artifacts.DAOTimelock.abi, deployer);
    const PROPOSER_ROLE = await timelockC.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelockC.EXECUTOR_ROLE();

    let tx = await timelockC.grantRole(PROPOSER_ROLE, govAddr);
    let receipt = await tx.wait();
    results.push({ operation: "Grant PROPOSER_ROLE", gasUsed: receipt.gasUsed });

    tx = await timelockC.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    receipt = await tx.wait();
    results.push({ operation: "Grant EXECUTOR_ROLE", gasUsed: receipt.gasUsed });

    console.log("\n📊 TOKEN OPERATIONS\n");

    // Token transfer
    const tokenC = new ethers.Contract(tokenAddr, artifacts.GOVToken.abi, deployer);
    tx = await tokenC.transfer(voter1Addr, ethers.parseEther("100000"));
    receipt = await tx.wait();
    results.push({ operation: "Token Transfer", gasUsed: receipt.gasUsed });
    console.log(`  Transfer:        ${receipt.gasUsed.toLocaleString()} gas`);

    // Delegate
    const tokenV1 = new ethers.Contract(tokenAddr, artifacts.GOVToken.abi, voter1);
    tx = await tokenV1.delegate(voter1Addr);
    receipt = await tx.wait();
    results.push({ operation: "Token Delegate", gasUsed: receipt.gasUsed });
    console.log(`  Delegate:        ${receipt.gasUsed.toLocaleString()} gas`);

    await provider.send("evm_mine", []);

    // Fund treasury
    tx = await deployer.sendTransaction({ to: treasuryAddr, value: ethers.parseEther("10") });
    receipt = await tx.wait();
    results.push({ operation: "Fund Treasury", gasUsed: receipt.gasUsed });
    console.log(`  Fund Treasury:   ${receipt.gasUsed.toLocaleString()} gas`);

    console.log("\n📊 GOVERNANCE OPERATIONS\n");

    // Create proposal
    const treasuryIface = new ethers.Interface(artifacts.Treasury.abi);
    const calldata = treasuryIface.encodeFunctionData("withdrawETH", [voter2Addr, ethers.parseEther("1")]);

    const govV1 = new ethers.Contract(govAddr, artifacts.DAOGovernor.abi, voter1);
    tx = await govV1.propose([treasuryAddr], [0], [calldata], "Withdraw 1 ETH");
    receipt = await tx.wait();
    results.push({ operation: "Create Proposal", gasUsed: receipt.gasUsed });
    console.log(`  Create Proposal: ${receipt.gasUsed.toLocaleString()} gas`);

    // Get proposal ID
    let proposalId: bigint | undefined;
    for (const log of receipt.logs) {
        try {
            const parsed = govV1.interface.parseLog(log);
            if (parsed?.name === "ProposalCreated") {
                proposalId = parsed.args[0];
                break;
            }
        } catch { }
    }

    // Vote
    await provider.send("evm_mine", []);
    await provider.send("evm_mine", []);

    tx = await govV1.castVote(proposalId, 1);
    receipt = await tx.wait();
    results.push({ operation: "Cast Vote", gasUsed: receipt.gasUsed });
    console.log(`  Cast Vote:       ${receipt.gasUsed.toLocaleString()} gas`);

    // End voting
    for (let i = 0; i < 105; i++) await provider.send("evm_mine", []);

    // Queue
    const descHash = ethers.keccak256(ethers.toUtf8Bytes("Withdraw 1 ETH"));
    tx = await govV1.queue([treasuryAddr], [0], [calldata], descHash);
    receipt = await tx.wait();
    results.push({ operation: "Queue Proposal", gasUsed: receipt.gasUsed });
    console.log(`  Queue Proposal:  ${receipt.gasUsed.toLocaleString()} gas`);

    // Execute
    await provider.send("evm_increaseTime", [3601]);
    await provider.send("evm_mine", []);

    tx = await govV1.execute([treasuryAddr], [0], [calldata], descHash);
    receipt = await tx.wait();
    results.push({ operation: "Execute Proposal", gasUsed: receipt.gasUsed });
    console.log(`  Execute:         ${receipt.gasUsed.toLocaleString()} gas`);

    console.log("\n📊 EMERGENCY OPERATIONS\n");

    // Pause
    const pauseC = new ethers.Contract(pauseAddr, artifacts.EmergencyPause.abi, deployer);
    tx = await pauseC.pause();
    receipt = await tx.wait();
    results.push({ operation: "Emergency Pause", gasUsed: receipt.gasUsed });
    console.log(`  Pause:           ${receipt.gasUsed.toLocaleString()} gas`);

    tx = await pauseC.unpause();
    receipt = await tx.wait();
    results.push({ operation: "Emergency Unpause", gasUsed: receipt.gasUsed });
    console.log(`  Unpause:         ${receipt.gasUsed.toLocaleString()} gas`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("                    GAS SUMMARY");
    console.log("=".repeat(60));

    const totalDeployment = results
        .filter(r => r.operation.startsWith("Deploy"))
        .reduce((acc, r) => acc + r.gasUsed, 0n);

    const totalOperations = results
        .filter(r => !r.operation.startsWith("Deploy"))
        .reduce((acc, r) => acc + r.gasUsed, 0n);

    console.log(`\n  Total Deployment Gas:  ${totalDeployment.toLocaleString()}`);
    console.log(`  Total Operations Gas:  ${totalOperations.toLocaleString()}`);
    console.log(`  Grand Total:           ${(totalDeployment + totalOperations).toLocaleString()}`);

    // Estimated costs at different gas prices
    console.log("\n  Estimated Deployment Costs:");
    const gasPrices = [10, 30, 100]; // gwei
    for (const gwei of gasPrices) {
        const costWei = totalDeployment * BigInt(gwei) * 1000000000n;
        const costEth = Number(costWei) / 1e18;
        console.log(`    @ ${gwei} gwei: ${costEth.toFixed(4)} ETH`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Gas profiling complete!");
    console.log("=".repeat(60));

    // Save results to file
    const report = results.map(r => `${r.operation}: ${r.gasUsed.toString()}`).join("\n");
    fs.writeFileSync(path.join(__dirname, "..", "GAS_REPORT.md"),
        `# Gas Report

## Deployment Costs

| Contract | Gas Used |
|----------|----------|
${results.filter(r => r.operation.startsWith("Deploy")).map(r => `| ${r.operation.replace("Deploy ", "")} | ${r.gasUsed.toLocaleString()} |`).join("\n")}

**Total Deployment: ${totalDeployment.toLocaleString()} gas**

## Operation Costs

| Operation | Gas Used |
|-----------|----------|
${results.filter(r => !r.operation.startsWith("Deploy")).map(r => `| ${r.operation} | ${r.gasUsed.toLocaleString()} |`).join("\n")}

## Cost Estimates

| Gas Price | Deployment Cost |
|-----------|-----------------|
| 10 gwei | ${(Number(totalDeployment * 10n * 1000000000n) / 1e18).toFixed(4)} ETH |
| 30 gwei | ${(Number(totalDeployment * 30n * 1000000000n) / 1e18).toFixed(4)} ETH |
| 100 gwei | ${(Number(totalDeployment * 100n * 1000000000n) / 1e18).toFixed(4)} ETH |
`);
    console.log("\n📄 Gas report saved to GAS_REPORT.md");
}

main().catch(console.error);
