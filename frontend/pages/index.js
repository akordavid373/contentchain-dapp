import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import axios from 'axios';

const ContentChainStellar = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contents, setContents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [basePrice, setBasePrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const BACKEND_URL = 'http://localhost:3001';

  const contractABI = [
    "function createContent(string memory _ipfsHash, uint256 _basePrice) external returns (uint256)",
    "function tipContent(uint256 _tokenId) external payable",
    "function createSubscription(uint256 _tokenId, uint256 _tierIndex, uint256 _monthlyRate) external payable",
    "function renewSubscription(uint256 _tokenId) external payable",
    "function cancelSubscription(uint256 _tokenId) external",
    "function getContent(uint256 _tokenId) external view returns (tuple(uint256 tokenId, address creator, string ipfsHash, uint256 basePrice, uint256 totalTips, uint256 subscriptionRevenue, bool isActive, uint256 createdAt))",
    "function getCreatorContents(address _creator) external view returns (uint256[])",
    "function getAllContents() external view returns (uint256[])",
    "function getSubscriptionTiers(uint256 _tokenId) external pure returns (tuple(string name, uint256 monthlyRate, string[] benefits, bool isActive)[3])",
    "function getActiveSubscriptions(uint256 _tokenId) external view returns (tuple(uint256 tokenId, address subscriber, uint256 tierIndex, uint256 startDate, uint256 lastPayment, bool isActive)[])",
    "function getSubscriberSubscriptions(address _subscriber) external view returns (uint256[])",
    "function hasActiveSubscription(uint256 _tokenId, address _subscriber) external view returns (bool)"
  ];

  useEffect(() => {
    loadContents();
    if (account) {
      loadSubscriptions();
    }
  }, [account]);

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setAccount(address);
      setProvider(provider);
    } catch (error) {
      console.error('Error connecting wallet:', error);
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
      return response.data.ipfsHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      return null;
    }
  };

  const createContent = async () => {
    if (!account || !file || !basePrice) {
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

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const priceInWei = ethers.parseEther(basePrice);
      const tx = await contract.createContent(ipfsHash, priceInWei);
      await tx.wait();

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

  const tipContent = async (tokenId) => {
    if (!account) {
      alert('Please connect wallet');
      return;
    }

    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const tx = await contract.tipContent(tokenId, { value: ethers.parseEther('0.01') });
      await tx.wait();

      alert('Tip sent successfully!');
      loadContents();
    } catch (error) {
      console.error('Error tipping content:', error);
      alert('Error tipping content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToContent = async (tokenId, tierIndex, monthlyRate) => {
    if (!account) {
      alert('Please connect wallet');
      return;
    }

    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const rateInWei = ethers.parseEther(monthlyRate);
      const tx = await contract.createSubscription(tokenId, tierIndex, rateInWei, { value: rateInWei });
      await tx.wait();

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

  const renewSubscription = async (tokenId, monthlyRate) => {
    if (!account) {
      alert('Please connect wallet');
      return;
    }

    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const rateInWei = ethers.parseEther(monthlyRate);
      const tx = await contract.renewSubscription(tokenId, { value: rateInWei });
      await tx.wait();

      alert('Subscription renewed successfully!');
      loadContents();
      loadSubscriptions();
    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert('Error renewing subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (tokenId) => {
    if (!account) {
      alert('Please connect wallet');
      return;
    }

    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const tx = await contract.cancelSubscription(tokenId);
      await tx.wait();

      alert('Subscription cancelled successfully!');
      loadContents();
      loadSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Error cancelling subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const SubscriptionTierCard = ({ content, tier }) => (
    <div className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-lg">{tier.name}</h4>
        <span className="text-blue-600 font-bold">{tier.monthlyRate} ETH/month</span>
      </div>
      <ul className="text-sm text-gray-600 mb-3">
        {tier.benefits.map((benefit, index) => (
          <li key={index} className="mb-1">• {benefit}</li>
        ))}
      </ul>
      <button
        onClick={() => subscribeToContent(content.tokenId, tier.index, tier.monthlyRate)}
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
          <p className="text-gray-600 mb-4">Decentralized Creator Monetization with Continuous Funding</p>
          
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
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
                    Base Price (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0.1"
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
                    <div key={sub.tokenId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Content #{sub.tokenId}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Creator: {sub.creator.slice(0, 6)}...{sub.creator.slice(-4)}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => renewSubscription(sub.tokenId, sub.subscriptionTiers[0].monthlyRate)}
                          disabled={loading}
                          className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => cancelSubscription(sub.tokenId)}
                          disabled={loading}
                          className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
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
                <div key={content.tokenId} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">Content #{content.tokenId}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Creator: {content.creator.slice(0, 6)}...{content.creator.slice(-4)}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Created: {new Date(content.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-lg font-semibold text-blue-600">Base: {content.basePrice} ETH</p>
                    <p className="text-sm text-gray-600">Tips: {content.totalTips} ETH</p>
                    <p className="text-sm text-gray-600">Subscriptions: {content.subscriptionRevenue} ETH</p>
                    <p className="text-sm text-gray-600">Active Subs: {content.activeSubscriptions}</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => tipContent(content.tokenId)}
                      disabled={loading}
                      className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors disabled:bg-gray-400 text-sm"
                    >
                      Tip 0.01 ETH
                    </button>
                    
                    {content.subscriptionTiers && content.subscriptionTiers.map((tier) => (
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
