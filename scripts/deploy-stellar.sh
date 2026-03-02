#!/bin/bash

# Stellar deployment script for ContentChain

echo "🚀 Deploying ContentChain to Stellar Network..."

# Check if Soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Soroban CLI not found. Please install it first:"
    echo "cargo install soroban-cli --locked"
    exit 1
fi

# Set network (testnet by default)
NETWORK=${1:-testnet}
echo "📡 Deploying to $NETWORK network"

# Build the contract
echo "🔨 Building Stellar contract..."
cargo build --target wasm32-unknown-unknown --release

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Deploy the contract
echo "📤 Deploying contract to Stellar..."
CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/contentchain_stellar.wasm \
    --source $SOROBAN_SECRET_KEY \
    --network $NETWORK)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Contract deployed successfully!"
echo "📍 Contract ID: $CONTRACT_ID"

# Save contract ID to environment file
echo "CONTRACT_ID=$CONTRACT_ID" > .env.stellar
echo "NETWORK=$NETWORK" >> .env.stellar
echo "STELLAR_HORIZON_URL=https://horizon-$NETWORK.stellar.org" >> .env.stellar

echo "📄 Contract ID saved to .env.stellar"

# Initialize contract if needed
echo "🔧 Initializing contract..."
soroban contract invoke \
    --id $CONTRACT_ID \
    --source $SOROBAN_SECRET_KEY \
    --network $NETWORK \
    -- __init

if [ $? -eq 0 ]; then
    echo "✅ Contract initialized successfully!"
else
    echo "⚠️ Contract initialization failed (may already be initialized)"
fi

echo "🎉 ContentChain Stellar deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend: cd backend && node stellar-server.js"
echo "2. Start the frontend: cd frontend && npm run dev"
echo "3. Connect your Stellar wallet and start creating content!"
