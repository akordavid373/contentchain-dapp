# ContentChain Stellar - Decentralized Creator Platform on Stellar Blockchain

A Web3 application built entirely on **Stellar blockchain** for decentralized content creation and monetization.

## 🌟 Why Stellar?

- **Low Transaction Costs**: ~0.00001 XLM per transaction vs Ethereum's gas fees
- **Fast Transactions**: 3-5 seconds confirmation time
- **Built-in DEX**: Native asset exchange capabilities
- **Smart Contracts**: Soroban smart contract platform
- **Sustainable**: Proof-of-Agree consensus, environmentally friendly

## 🏗️ Stellar Architecture

### **Smart Contract Layer (Soroban)**
- **Language**: Rust (via Soroban)
- **Contract**: ContentChainStellar.sol (conceptual representation)
- **Features**: Content NFTs, subscriptions, payments
- **Storage**: On-chain metadata with IPFS integration

### **Backend API**
- **Stellar SDK**: Direct integration with Stellar Horizon
- **Payment Processing**: Native XLM and custom tokens
- **Account Management**: Stellar keypair management
- **Contract Interaction**: Soroban contract calls

### **Frontend Application**
- **Stellar Wallet**: Direct keypair management
- **Transaction Signing**: Client-side transaction creation
- **Real-time Updates**: Horizon streaming API
- **User Experience**: Seamless Stellar integration

## 📁 Project Structure

```
contentchain/
├── contracts/
│   ├── ContentChainStellar.sol  # Stellar smart contract (Rust concept)
│   ├── Cargo.toml               # Rust/Soroban dependencies
│   └── src/                     # Rust contract source
├── backend/
│   ├── stellar-server.js        # Stellar API server
│   └── package-stellar.json     # Stellar dependencies
├── frontend/
│   ├── pages/stellar-index.js   # Stellar frontend
│   └── package-stellar.json     # Stellar frontend deps
└── README-STELLAR.md            # This documentation
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Rust (for Soroban development)
- Soroban CLI tools

### 1. Install Rust and Soroban

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install soroban-cli --locked
```

### 2. Install Node.js Dependencies

**Backend:**
```bash
cd backend
npm install express cors stellar-sdk ipfs-http-client multer dotenv axios
npm install --save-dev nodemon
```

**Frontend:**
```bash
cd frontend
npm install next react react-dom stellar-sdk axios tailwindcss autoprefixer postcss
```

### 3. Deploy Stellar Smart Contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/contentchain_stellar.wasm --source <YOUR_SECRET_KEY>
```

### 4. Start Backend Server

```bash
cd backend
node stellar-server.js
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

## 💡 Stellar Features

### **Account Management**
- **KeyPair Generation**: Create new Stellar accounts
- **Testnet Funding**: Automatic testnet account funding
- **Secret Key Security**: Client-side key management
- **Multi-signature**: Enhanced security options

### **Payment System**
- **XLM Payments**: Native Stellar lumens
- **Custom Tokens**: Creator-specific tokens
- **Subscription Payments**: Recurring payment setup
- **Micro-tips**: Fractional XLM tipping

### **Smart Contract Integration**
- **Content Creation**: On-chain content registration
- **Subscription Management**: Tier-based subscriptions
- **Revenue Distribution**: Automated payment splitting
- **Access Control**: Permission-based content access

## 🎪 Subscription Tiers (Stellar)

### **Basic Tier - 0.01 XLM/month**
- ✅ Access to all creator content
- ✅ Support creator directly
- ✅ Community membership

### **Premium Tier - 0.05 XLM/month**
- ✅ All Basic benefits
- ✅ Exclusive content access
- ✅ Early release content
- ✅ Behind-the-scenes content

### **Supporter Tier - 0.1 XLM/month**
- ✅ All Premium benefits
- ✅ Direct messaging with creator
- ✅ Custom content requests
- ✅ VIP community access

## 🔧 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Blockchain** | Stellar | Fast, low-cost transactions |
| **Smart Contracts** | Soroban (Rust) | On-chain logic |
| **Storage** | IPFS | Decentralized file storage |
| **Backend** | Node.js, Stellar SDK | API & Stellar integration |
| **Frontend** | Next.js, Stellar SDK | User interface |
| **Payments** | XLM, Custom Tokens | Native currency |

## 🚀 API Endpoints

### **Account Management**
- `POST /api/stellar/create-account` - Create new Stellar account
- `GET /api/stellar/balance/:publicKey` - Get account balance

### **Content Management**
- `GET /api/contents` - Get all content
- `POST /api/content/create` - Create new content
- `POST /api/upload` - Upload file to IPFS

### **Subscription Management**
- `POST /api/subscription/create` - Create subscription
- `GET /api/subscriptions/:publicKey` - Get user subscriptions
- `POST /api/content/tip` - Send tip to creator

### **Payment Processing**
- `POST /api/payment/send` - Send XLM payment
- `GET /api/payment/history/:publicKey` - Payment history

## 🔄 Stellar vs Ethereum Comparison

| Feature | Ethereum | Stellar |
|---------|----------|---------|
| **Transaction Cost** | $5-50 (gas fees) | $0.00001 (fixed) |
| **Speed** | 15 seconds - 5 minutes | 3-5 seconds |
| **Energy** | Proof-of-Work (high) | Proof-of-Agree (low) |
| **Smart Contracts** | Solidity | Soroban (Rust) |
| **Native DEX** | Uniswap (external) | Built-in DEX |
| **Asset Support** | ERC-20 tokens | Native multi-asset |

## 🎯 Benefits of Stellar

### **For Creators**
- **Lower Fees**: More revenue from each transaction
- **Global Access**: Stellar's worldwide network
- **Fast Payments**: Quick access to funds
- **Multi-currency**: Support for various assets

### **For Users**
- **Cheap Transactions**: Micro-payments without high fees
- **Instant Confirmation**: Real-time payment processing
- **Simple UX**: No complex gas fee calculations
- **Mobile Friendly**: Stellar's mobile-first design

### **For Developers**
- **Easy Integration**: Simple SDK and APIs
- **Reliable Network**: 99.9% uptime
- **Scalable**: Handles thousands of transactions per second
- **Open Source**: Transparent and auditable code

## 🔮 Future Enhancements

- **Stellar Asset Tokens**: Creator-specific tokens
- **Cross-chain Bridges**: Ethereum-Stellar interoperability
- **Mobile App**: Native Stellar mobile application
- **Advanced Analytics**: On-chain data analytics
- **DAO Integration**: Community governance features

## 📄 License

MIT License - feel free to use, modify, and distribute this code for your own Stellar projects.

---

**Built with ❤️ for the Stellar ecosystem**
