const { ethers } = require("hardhat");

async function main() {
  const ContentChain = await ethers.getContractFactory("ContentChain");
  const contentChain = await ContentChain.deploy();

  await contentChain.deployed();

  console.log("ContentChain deployed to:", contentChain.address);
  
  // Save contract address to frontend
  const fs = require('fs');
  const contractAddress = {
    address: contentChain.address,
    abi: require('../frontend/src/artifacts/ContentChain.json').abi
  };
  
  if (!fs.existsSync('../frontend/src/contracts')) {
    fs.mkdirSync('../frontend/src/contracts', { recursive: true });
  }
  
  fs.writeFileSync(
    '../frontend/src/contracts/ContentChain.json',
    JSON.stringify(contractAddress, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
