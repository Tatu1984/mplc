import { ethers } from 'ethers';

// Initialize provider
export const getProvider = () => {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Initialize wallet (for backend operations)
export const getWallet = () => {
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BLOCKCHAIN_PRIVATE_KEY not set');
  }
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

// Get contract instance
export const getContract = (address: string, abi: ethers.InterfaceAbi) => {
  const wallet = getWallet();
  return new ethers.Contract(address, abi, wallet);
};

// Token contract ABIs (simplified)
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function mint(address to, string memory tokenURI) returns (uint256)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// SRGG Marketplace Contract ABI (custom)
export const SRGG_MARKETPLACE_ABI = [
  'function createToken(string memory tokenURI, bytes32 listingId) returns (uint256)',
  'function verifyToken(uint256 tokenId) returns (bool)',
  'function transferToken(uint256 tokenId, address to) returns (bool)',
  'function anchorProof(uint256 tokenId, string memory ipfsHash) returns (bool)',
  'event TokenCreated(uint256 indexed tokenId, bytes32 indexed listingId, address owner, string tokenURI)',
  'event TokenVerified(uint256 indexed tokenId, address verifier, uint256 timestamp)',
  'event ProofAnchored(uint256 indexed tokenId, string ipfsHash, uint256 timestamp)',
];

// Utility functions
export const toWei = (amount: string | number) => {
  return ethers.parseEther(amount.toString());
};

export const fromWei = (amount: bigint) => {
  return ethers.formatEther(amount);
};

export const isValidAddress = (address: string) => {
  return ethers.isAddress(address);
};

export const getTransactionReceipt = async (txHash: string) => {
  const provider = getProvider();
  return await provider.getTransactionReceipt(txHash);
};

export const waitForTransaction = async (txHash: string, confirmations = 1) => {
  const provider = getProvider();
  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error('Transaction not found');
  return await tx.wait(confirmations);
};

// IPFS integration (for metadata storage)
export const uploadToIPFS = async (data: Record<string, unknown>): Promise<string> => {
  const ipfsHost = process.env.IPFS_HOST || 'localhost';
  const ipfsPort = process.env.IPFS_PORT || '5001';
  const ipfsProtocol = process.env.IPFS_PROTOCOL || 'http';

  const url = `${ipfsProtocol}://${ipfsHost}:${ipfsPort}/api/v0/add`;

  const formData = new FormData();
  formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload to IPFS');
  }

  const result = await response.json();
  return result.Hash; // Returns IPFS hash
};

export const getFromIPFS = async (hash: string): Promise<Record<string, unknown>> => {
  const ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.ipfs.io';
  const url = `${ipfsGateway}/ipfs/${hash}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch from IPFS');
  }

  return await response.json();
};
