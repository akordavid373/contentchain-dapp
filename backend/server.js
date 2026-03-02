const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { create } = require('ipfs-http-client');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// IPFS setup
const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' });

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Contract setup
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractABI = [
  "function createContent(string memory _ipfsHash, uint256 _price) external returns (uint256)",
  "function tipContent(uint256 _tokenId) external payable",
  "function purchaseContent(uint256 _tokenId) external payable",
  "function getContent(uint256 _tokenId) external view returns (tuple(uint256 tokenId, address creator, string ipfsHash, uint256 price, uint256 tips, bool isActive, uint256 createdAt))",
  "function getCreatorContents(address _creator) external view returns (uint256[])",
  "function getAllContents() external view returns (uint256[])",
  "event ContentCreated(uint256 indexed tokenId, address indexed creator, string ipfsHash, uint256 price)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// Routes
app.get('/api/contents', async (req, res) => {
  try {
    const contentIds = await contract.getAllContents();
    const contents = [];

    for (const id of contentIds) {
      const content = await contract.getContent(id);
      contents.push({
        tokenId: id.toString(),
        creator: content.creator,
        ipfsHash: content.ipfsHash,
        price: ethers.formatEther(content.price),
        tips: ethers.formatEther(content.tips),
        isActive: content.isActive,
        createdAt: new Date(content.createdAt * 1000).toISOString()
      });
    }

    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contents/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const content = await contract.getContent(tokenId);

    res.json({
      tokenId: tokenId,
      creator: content.creator,
      ipfsHash: content.ipfsHash,
      price: ethers.formatEther(content.price),
      tips: ethers.formatEther(content.tips),
      isActive: content.isActive,
      createdAt: new Date(content.createdAt * 1000).toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/creator/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const contentIds = await contract.getCreatorContents(address);
    const contents = [];

    for (const id of contentIds) {
      const content = await contract.getContent(id);
      contents.push({
        tokenId: id.toString(),
        creator: content.creator,
        ipfsHash: content.ipfsHash,
        price: ethers.formatEther(content.price),
        tips: ethers.formatEther(content.tips),
        isActive: content.isActive,
        createdAt: new Date(content.createdAt * 1000).toISOString()
      });
    }

    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = require('fs').readFileSync(req.file.path);
    const result = await ipfs.add(fileBuffer);
    
    // Clean up uploaded file
    require('fs').unlinkSync(req.file.path);

    res.json({
      ipfsHash: result.path,
      fileName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/content/create', async (req, res) => {
  try {
    const { ipfsHash, price, signerAddress } = req.body;
    
    if (!ipfsHash || !price || !signerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const priceInWei = ethers.parseEther(price.toString());
    const tx = await contract.createContent(ipfsHash, priceInWei);
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/content/tip', async (req, res) => {
  try {
    const { tokenId, amount, signerAddress } = req.body;
    
    if (!tokenId || !amount || !signerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const amountInWei = ethers.parseEther(amount.toString());
    const tx = await contract.tipContent(tokenId, { value: amountInWei });
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/content/purchase', async (req, res) => {
  try {
    const { tokenId, amount, signerAddress } = req.body;
    
    if (!tokenId || !amount || !signerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const amountInWei = ethers.parseEther(amount.toString());
    const tx = await contract.purchaseContent(tokenId, { value: amountInWei });
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ContentChain backend running on port ${PORT}`);
});
