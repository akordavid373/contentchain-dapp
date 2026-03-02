const { ethers } = require("hardhat");

async function main() {
  // Deploy DripsHub mock for local development
  const DripsHub = await ethers.getContractFactory("DripsHub");
  const dripsHub = await DripsHub.deploy();
  await dripsHub.deployed();
  console.log("DripsHub deployed to:", dripsHub.address);

  // Deploy ContentChainStellar
  const ContentChainStellar = await ethers.getContractFactory("ContentChainStellar");
  const contentChain = await ContentChainStellar.deploy(dripsHub.address);

  await contentChain.deployed();

  console.log("ContentChainStellar deployed to:", contentChain.address);
  
  // Save contract addresses to frontend
  const fs = require('fs');
  const contractData = {
    contentChain: {
      address: contentChain.address,
      abi: require('../frontend/src/artifacts/ContentChainStellar.json').abi
    },
    dripsHub: {
      address: dripsHub.address,
      abi: require('../frontend/src/artifacts/DripsHub.json').abi
    }
  };
  
  if (!fs.existsSync('../frontend/src/contracts')) {
    fs.mkdirSync('../frontend/src/contracts', { recursive: true });
  }
  
  fs.writeFileSync(
    '../frontend/src/contracts/ContentChainStellar.json',
    JSON.stringify(contractData.contentChain, null, 2)
  );
  
  fs.writeFileSync(
    '../frontend/src/contracts/DripsHub.json',
    JSON.stringify(contractData.dripsHub, null, 2)
  );

  // Update backend .env example
  const envContent = `PORT=3001
CONTRACT_ADDRESS=${contentChain.address}
DRIPS_HUB_ADDRESS=${dripsHub.address}
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://127.0.0.1:8545`;
  
  fs.writeFileSync('../backend/.env.example', envContent);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
