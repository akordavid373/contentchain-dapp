import { useState, useEffect } from 'react';
import StellarSdk from 'stellar-sdk';
import axios from 'axios';

const ContentChainStellar = () => {
  const [account, setAccount] = useState(null);
  const [keypair, setKeypair] = useState(null);
  const [contents, setContents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [basePrice, setBasePrice] = useState('');
  const [uploading, setUploading] = useState(false);

  const BACKEND_URL = 'http://localhost:3001';
  const STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';

  useEffect(() => {
    loadContents();
    if (account) {
      loadSubscriptions();
    }
  }, [account]);

  const createStellarAccount = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/stellar/create-account`);
      const { public_key, secret } = response.data;
      
      setKeypair({ publicKey: public_key, secret });
      setAccount(public_key);
      
      alert('Stellar account created! Save your secret key securely.');
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error creating Stellar account');
    }
  };

  const connectStellarWallet = async () => {
    const secret = prompt('Enter your Stellar secret key:');
    if (!secret) return;

    try {
      const pair = StellarSdk.Keypair.fromSecret(secret);
      setKeypair({ publicKey: pair.publicKey(), secret });
      setAccount(pair.publicKey());
      
      // Verify account exists
      const server = new StellarSdk.Horizon.Server(STELLAR_HORIZON_URL);
      await server.loadAccount(pair.publicKey());
      
      alert('Stellar wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting Stellar wallet. Check your secret key.');
    }
  };

  const loadContents = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/contents`);
      setContents(response.data);
    } catch (error) {
      console.error('Error loading contents:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/subscriptions/${account}`);
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const uploadToIPFS = async () => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.ipfs_hash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      return null;
    }
  };

  const createContent = async () => {
    if (!account || !keypair || !file || !basePrice) {
      alert('Please connect wallet, select file, and set base price');
      return;
    }

    setUploading(true);
    setLoading(true);

    try {
      const ipfsHash = await uploadToIPFS();
      if (!ipfsHash) {
        throw new Error('Failed to upload to IPFS');
      }

      const response = await axios.post(`${BACKEND_URL}/api/content/create`, {
        ipfs_hash: ipfsHash,
        base_price: basePrice,
        creator_public_key: account,
        creator_secret: keypair.secret
      });

      alert('Content created successfully!');
      setFile(null);
      setBasePrice('');
      loadContents();
    } catch (error) {
      console.error('Error creating content:', error);
      alert('Error creating content: ' + error.message);
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const tipContent = async (contentId, creatorPublicKey) => {
    if (!account || !keypair) {
      alert('Please connect Stellar wallet');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/content/tip`, {
        content_id: contentId,
        amount: '0.01', // 0.01 XLM tip
        tipper_public_key: account,
        tipper_secret: keypair.secret,
        creator_public_key: creatorPublicKey
      });

      alert('Tip sent successfully!');
      loadContents();
    } catch (error) {
      console.error('Error tipping content:', error);
      alert('Error tipping content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToContent = async (contentId, tierIndex, creatorPublicKey) => {
    if (!account || !keypair) {
      alert('Please connect Stellar wallet');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/subscription/create`, {
        content_id: contentId,
        tier_index: tierIndex,
        subscriber_public_key: account,
        subscriber_secret: keypair.secret,
        creator_public_key: creatorPublicKey
      });

      alert('Subscription created successfully!');
      loadContents();
      loadSubscriptions();
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Error creating subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const SubscriptionTierCard = ({ content, tier }) => (
    <div className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-lg">{tier.name}</h4>
        <span className="text-blue-600 font-bold">{tier.monthly_rate} XLM/month</span>
      </div>
      <ul className="text-sm text-gray-600 mb-3">
        {tier.benefits.map((benefit, index) => (
          <li key={index} className="mb-1">• {benefit}</li>
        ))}
      </ul>
      <button
        onClick={() => subscribeToContent(content.id, tier.index, content.creator)}
        disabled={loading}
        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 text-sm"
      >
        Subscribe
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ContentChain Stellar</h1>
          <p className="text-gray-600 mb-4">Decentralized Creator Platform on Stellar Blockchain</p>
          
          <div className="space-x-4">
            {!account ? (
              <>
                <button
                  onClick={createStellarAccount}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Stellar Account
                </button>
                <button
                  onClick={connectStellarWallet}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Connect Existing Wallet
                </button>
              </>
            ) : (
              <div className="bg-gray-800 text-white px-4 py-2 rounded">
                {account.slice(0, 8)}...{account.slice(-8)}
              </div>
            )}
          </div>
        </header>

        {account && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Create New Content</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (XLM)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0.01"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={createContent}
                  disabled={uploading || loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                  {uploading ? 'Creating...' : 'Create Content'}
                </button>
              </div>
            </div>

            {subscriptions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">My Subscriptions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.content_id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Content #{sub.content_id}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Creator: {sub.creator.slice(0, 8)}...{sub.creator.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Tier: {sub.tier_index === 0 ? 'Basic' : sub.tier_index === 1 ? 'Premium' : 'Supporter'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Monthly: {sub.monthly_rate} XLM
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6">Available Content</h2>
          
          {contents.length === 0 ? (
            <p className="text-gray-500">No content available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.map((content) => (
                <div key={content.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">Content #{content.id}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Creator: {content.creator.slice(0, 8)}...{content.creator.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Created: {new Date(content.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-lg font-semibold text-blue-600">Base: {content.base_price} XLM</p>
                    <p className="text-sm text-gray-600">Tips: {content.total_tips} XLM</p>
                    <p className="text-sm text-gray-600">Subscriptions: {content.subscription_revenue} XLM</p>
                    <p className="text-sm text-gray-600">Active Subs: {content.active_subscriptions}</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => tipContent(content.id, content.creator)}
                      disabled={loading}
                      className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors disabled:bg-gray-400 text-sm"
                    >
                      Tip 0.01 XLM
                    </button>
                    
                    {content.subscription_tiers && content.subscription_tiers.map((tier) => (
                      <SubscriptionTierCard key={tier.index} content={content} tier={tier} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentChainStellar;
