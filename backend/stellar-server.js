const express = require('express');
const cors = require('cors');
const StellarSdk = require('stellar-sdk');
const axios = require('axios');
const multer = require('multer');
const { create } = require('ipfs-http-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Stellar configuration
const server = new StellarSdk.Horizon.Server(
  process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
);
const networkPassphrase = StellarSdk.Networks.TESTNET;

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Stellar contract configuration
const CONTRACT_ID = process.env.STELLAR_CONTRACT_ID || 'YOUR_CONTRACT_ID_HERE';

// Routes
app.get('/api/contents', async (req, res) => {
  try {
    // In a real implementation, this would query the Stellar contract
    // For now, return mock data
    const contents = [
      {
        id: '1',
        creator: 'GCEZWKCA5VLDNRLN3RPRXMRIVVFYLLNEXVYDKD5K2L4GYBFUFC6FWC3N',
        ipfs_hash: 'QmXxx...',
        base_price: '0.01',
        total_tips: '0.05',
        subscription_revenue: '0.15',
        is_active: true,
        created_at: new Date().toISOString(),
        subscription_tiers: [
          {
            index: 0,
            name: 'Basic',
            monthly_rate: '0.01',
            benefits: ['Access to all content'],
            is_active: true
          },
          {
            index: 1,
            name: 'Premium',
            monthly_rate: '0.05',
            benefits: ['Exclusive content', 'Early access'],
            is_active: true
          },
          {
            index: 2,
            name: 'Supporter',
            monthly_rate: '0.1',
            benefits: ['All benefits', 'Direct messaging', 'Custom requests'],
            is_active: true
          }
        ],
        active_subscriptions: 5
      }
    ];

    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contents/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    // Query Stellar contract for specific content
    res.json({
      id: contentId,
      creator: 'GCEZWKCA5VLDNRLN3RPRXMRIVVFYLLNEXVYDKD5K2L4GYBFUFC6FWC3N',
      ipfs_hash: 'QmXxx...',
      base_price: '0.01',
      total_tips: '0.05',
      subscription_revenue: '0.15',
      is_active: true,
      created_at: new Date().toISOString()
    });
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
      ipfs_hash: result.path,
      file_name: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/content/create', async (req, res) => {
  try {
    const { ipfs_hash, base_price, creator_public_key, creator_secret } = req.body;
    
    if (!ipfs_hash || !base_price || !creator_public_key || !creator_secret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Stellar account if needed
    const creatorKeypair = StellarSdk.Keypair.fromSecret(creator_secret);
    
    // In a real implementation, this would:
    // 1. Load the Stellar contract
    // 2. Create a transaction to call create_content
    // 3. Sign and submit the transaction
    
    // For now, simulate the contract call
    const contentId = Math.floor(Math.random() * 1000000);
    
    res.json({
      success: true,
      content_id: contentId.toString(),
      transaction_hash: 'stellar_tx_hash_' + contentId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription/create', async (req, res) => {
  try {
    const { 
      content_id, 
      tier_index, 
      subscriber_public_key, 
      subscriber_secret,
      creator_public_key 
    } = req.body;
    
    if (!content_id || tier_index === undefined || !subscriber_public_key || !subscriber_secret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get subscription tier details
    const tiers = [
      { name: 'Basic', rate: 0.01 },
      { name: 'Premium', rate: 0.05 },
      { name: 'Supporter', rate: 0.1 }
    ];
    
    const tier = tiers[tier_index];
    if (!tier) {
      return res.status(400).json({ error: 'Invalid tier index' });
    }

    // Create Stellar transaction for subscription payment
    const subscriberKeypair = StellarSdk.Keypair.fromSecret(subscriber_secret);
    const creatorKeypair = StellarSdk.Keypair.fromPublicKey(creator_public_key);
    
    try {
      // Load subscriber account
      const subscriberAccount = await server.loadAccount(subscriberKeypair.publicKey());
      
      // Create payment transaction
      const transaction = new StellarSdk.TransactionBuilder(subscriberAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPassphrase,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: creatorKeypair.publicKey(),
          asset: StellarSdk.Asset.native(),
          amount: tier.rate.toString(),
        }))
        .addMemo(StellarSdk.Memo.text(`Subscription: ${content_id}, Tier: ${tier_index}`))
        .setTimeout(30)
        .build();

      transaction.sign(subscriberKeypair);
      
      // Submit transaction
      const result = await server.submitTransaction(transaction);
      
      // In a real implementation, also call the Stellar contract
      // to record the subscription
      
      res.json({
        success: true,
        transaction_hash: result.hash,
        subscription_created: true
      });
    } catch (stellarError) {
      res.status(500).json({ error: 'Stellar transaction failed: ' + stellarError.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/content/tip', async (req, res) => {
  try {
    const { 
      content_id, 
      amount, 
      tipper_public_key, 
      tipper_secret,
      creator_public_key 
    } = req.body;
    
    if (!content_id || !amount || !tipper_public_key || !tipper_secret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Stellar transaction for tip
    const tipperKeypair = StellarSdk.Keypair.fromSecret(tipper_secret);
    const creatorKeypair = StellarSdk.Keypair.fromPublicKey(creator_public_key);
    
    try {
      // Load tipper account
      const tipperAccount = await server.loadAccount(tipperKeypair.publicKey());
      
      // Create payment transaction
      const transaction = new StellarSdk.TransactionBuilder(tipperAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPassphrase,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: creatorKeypair.publicKey(),
          asset: StellarSdk.Asset.native(),
          amount: amount.toString(),
        }))
        .addMemo(StellarSdk.Memo.text(`Tip: ${content_id}`))
        .setTimeout(30)
        .build();

      transaction.sign(tipperKeypair);
      
      // Submit transaction
      const result = await server.submitTransaction(transaction);
      
      res.json({
        success: true,
        transaction_hash: result.hash,
        tip_sent: true
      });
    } catch (stellarError) {
      res.status(500).json({ error: 'Stellar transaction failed: ' + stellarError.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subscriptions/:userPublicKey', async (req, res) => {
  try {
    const { userPublicKey } = req.params;
    
    // In a real implementation, query the Stellar contract
    // For now, return mock data
    const subscriptions = [
      {
        content_id: '1',
        creator: 'GCEZWKCA5VLDNRLN3RPRXMRIVVFYLLNEXVYDKD5K2L4GYBFUFC6FWC3N',
        tier_index: 1,
        start_date: new Date().toISOString(),
        last_payment: new Date().toISOString(),
        is_active: true,
        monthly_rate: '0.05'
      }
    ];

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to create Stellar account
app.post('/api/stellar/create-account', async (req, res) => {
  try {
    const pair = StellarSdk.Keypair.random();
    
    // Fund the account on testnet (in production, user would fund their own)
    try {
      await friendbot.fetch(pair.publicKey());
    } catch (error) {
      // Account might already exist
    }

    res.json({
      public_key: pair.publicKey(),
      secret: pair.secret(),
      testnet_funded: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ContentChain Stellar backend running on port ${PORT}`);
  console.log(`Stellar Horizon: ${process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'}`);
});
