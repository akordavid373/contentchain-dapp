import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import axios from 'axios';

const ContentChain = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const BACKEND_URL = 'http://localhost:3001';

  const contractABI = [
    "function createContent(string memory _ipfsHash, uint256 _price) external returns (uint256)",
    "function tipContent(uint256 _tokenId) external payable",
    "function purchaseContent(uint256 _tokenId) external payable",
    "function getContent(uint256 _tokenId) external view returns (tuple(uint256 tokenId, address creator, string ipfsHash, uint256 price, uint256 tips, bool isActive, uint256 createdAt))",
    "function getCreatorContents(address _creator) external view returns (uint256[])",
    "function getAllContents() external view returns (uint256[])"
  ];

  useEffect(() => {
    loadContents();
  }, []);

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
    if (!account || !file || !price) {
      alert('Please connect wallet, select file, and set price');
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
      
      const priceInWei = ethers.parseEther(price);
      const tx = await contract.createContent(ipfsHash, priceInWei);
      await tx.wait();

      alert('Content created successfully!');
      setFile(null);
      setPrice('');
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

  const purchaseContent = async (tokenId, contentPrice) => {
    if (!account) {
      alert('Please connect wallet');
      return;
    }

    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      
      const tx = await contract.purchaseContent(tokenId, { value: ethers.parseEther(contentPrice) });
      await tx.wait();

      alert('Content purchased successfully!');
      loadContents();
    } catch (error) {
      console.error('Error purchasing content:', error);
      alert('Error purchasing content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ContentChain</h1>
          <p className="text-gray-600 mb-4">Decentralized Creator Monetization Platform</p>
          
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </header>

        {account && (
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
                  Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
                    <p className="text-lg font-semibold text-blue-600">{content.price} ETH</p>
                    <p className="text-sm text-gray-600">Tips: {content.tips} ETH</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => tipContent(content.tokenId)}
                      disabled={loading}
                      className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors disabled:bg-gray-400 text-sm"
                    >
                      Tip 0.01 ETH
                    </button>
                    
                    <button
                      onClick={() => purchaseContent(content.tokenId, content.price)}
                      disabled={loading || !content.isActive}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 text-sm"
                    >
                      Purchase for {content.price} ETH
                    </button>
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

export default ContentChain;
