# ContentChain - Decentralized Creator Monetization Platform

A Web3 application that allows creators to monetize their content through blockchain technology.

## Features

- **Smart Contract**: Ethereum-based content ownership and monetization
- **Backend API**: Node.js server for IPFS integration and contract interaction
- **Frontend**: React/Next.js interface with wallet connection
- **IPFS Storage**: Decentralized file storage for content
- **Tipping System**: Direct creator support via cryptocurrency
- **Purchase System**: Buy access to premium content

## Project Structure

```
contentchain/
├── contracts/           # Solidity smart contracts
├── backend/            # Node.js API server
├── frontend/           # Next.js React application
├── scripts/            # Deployment scripts
└── hardhat.config.js   # Hardhat configuration
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MetaMask or compatible Web3 wallet

### 1. Install Dependencies

**Root Project:**
```bash
npm install
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

**Backend:**
```bash
cd backend
npm install express cors ethers ipfs-http-client multer dotenv
npm install --save-dev nodemon
```

**Frontend:**
```bash
cd frontend
npm install next react react-dom ethers @walletconnect/web3-provider web3modal axios tailwindcss autoprefixer postcss
```

### 2. Start Local Blockchain

```bash
npx hardhat node
```

This will start a local Ethereum network with test accounts.

### 3. Deploy Smart Contract

In a new terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Start Backend Server

```bash
cd backend
cp .env.example .env
npm run dev
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

### 6. Connect Wallet

1. Open MetaMask
2. Add Localhost 8545 network
3. Import one of the test accounts from Hardhat output
4. Visit http://localhost:3000

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and select your Web3 provider
2. **Create Content**: Upload a file and set a price in ETH
3. **Tip Creators**: Send small amounts of ETH to support creators
4. **Purchase Content**: Buy access to premium content
5. **View Earnings**: Track tips and purchases

## Smart Contract Features

- ERC721-based content ownership
- IPFS integration for decentralized storage
- Tipping mechanism for creator support
- Purchase system for premium content
- Creator controls pricing and availability

## API Endpoints

- `GET /api/contents` - Get all content
- `GET /api/contents/:tokenId` - Get specific content
- `GET /api/creator/:address` - Get creator's content
- `POST /api/upload` - Upload file to IPFS
- `POST /api/content/create` - Create new content
- `POST /api/content/tip` - Tip content creator
- `POST /api/content/purchase` - Purchase content

## Technology Stack

- **Blockchain**: Ethereum, Hardhat
- **Smart Contracts**: Solidity, OpenZeppelin
- **Backend**: Node.js, Express, IPFS
- **Frontend**: Next.js, React, Tailwind CSS
- **Web3**: Ethers.js, Web3Modal

## License

MIT
