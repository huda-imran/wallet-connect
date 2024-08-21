// routes/wallet.js
const express = require('express');
const router = express.Router();
const { ethers, JsonRpcProvider } = require('ethers');
const Wallet = require('../models/Wallet');
const Approval = require('../models/Approval');

const provider = new JsonRpcProvider(process.env.INFURA_URL);

// USDT Contract ABI and Address
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

// /wallet/connect endpoint
router.post('/connect', async (req, res) => {
  const { walletAddress, referralCode } = req.body;

  // Basic validation
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  try {
    // Check if the wallet is already connected
    let wallet = await Wallet.findOne({ walletAddress });

    if (wallet) {
      return res.status(400).json({ error: 'Wallet already connected' });
    }

    // Create and save the new wallet connection
    wallet = new Wallet({
      walletAddress,
      referralCode: referralCode || null,
    });

    await wallet.save();

    res.json({
      walletConnected: true,
      referralStored: !!referralCode,
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// /transaction/approve endpoint
router.post('/approve', async (req, res) => {
    const { walletAddress, tokenAddress, approvedAmount, transactionHash } = req.body;
  
    // Basic validation
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return res.status(400).json({ error: 'Invalid token address format' });
    }
    if (!approvedAmount || isNaN(approvedAmount)) {
      return res.status(400).json({ error: 'Invalid approved amount' });
    }
    if (!transactionHash || !/^0x([A-Fa-f0-9]{64})$/.test(transactionHash)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }
  
    try {
      // Check if the transaction hash already exists
      let existingApproval = await Approval.findOne({ transactionHash });
      if (existingApproval) {
        return res.status(400).json({ error: 'Transaction hash already exists' });
      }
  
      // Create and save the approval data
      const approval = new Approval({
        walletAddress,
        tokenAddress,
        approvedAmount,
        transactionHash,
      });
  
      await approval.save();
  
      res.json({ approvalStored: true });
    } catch (error) {
      console.error('Error storing approval:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// /wallet/balances endpoint
router.post('/balances', async (req, res) => {
    const { walletAddresses } = req.body;
  
    if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing wallet addresses' });
    }
  
    try {
      const walletData = [];
  
      for (const walletAddress of walletAddresses) {
        // Fetch wallet details
        const wallet = await Wallet.findOne({ walletAddress });
        if (!wallet) {
          continue; // Skip wallets that aren't connected
        }
  
        // Fetch ETH balance
        const ethBalance = await provider.getBalance(walletAddress);
        const formattedEthBalance = ethers.utils.formatEther(ethBalance);
  
        // Fetch USDT balance
        const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
        const usdtBalance = await usdtContract.balanceOf(walletAddress);
        const formattedUsdtBalance = ethers.utils.formatUnits(usdtBalance, 6); // USDT has 6 decimals
  
        // Fetch approval details for the wallet
        const approval = await Approval.findOne({ walletAddress });
  
        walletData.push({
          walletAddress: wallet.walletAddress,
          balance: {
            eth: formattedEthBalance,
            usdt: formattedUsdtBalance,
          },
          permissionStatus: approval
            ? {
                approved: true,
                approvedAmount: approval.approvedAmount,
              }
            : {
                approved: false,
                approvedAmount: '0',
              },
        });
      }
  
      res.json({ wallets: walletData });
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// /referral/store endpoint
router.post('/referral/store', async (req, res) => {
    const { walletAddress, referralCode } = req.body;
  
    // Validate input
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    if (!referralCode) {
      return res.status(400).json({ error: 'Missing referral code' });
    }
  
    try {
      // Find the wallet by address
      let wallet = await Wallet.findOne({ walletAddress });
  
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
  
      // Update the wallet with the referral code
      wallet.referralCode = referralCode;
      await wallet.save();
  
      res.json({ referralStored: true });
    } catch (error) {
      console.error('Error storing referral code:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// /referral/verify endpoint
router.get('/referral/verify', async (req, res) => {
    const { referralCode } = req.query;
  
    // Validate input
    if (!referralCode) {
      return res.status(400).json({ error: 'Missing referral code' });
    }
  
    try {
      // Find a wallet associated with the referral code
      const wallet = await Wallet.findOne({ referralCode });
  
      if (!wallet) {
        return res.status(404).json({ valid: false, error: 'Referral code not found' });
      }
  
      // Mocked reward details (in a real scenario, this would be dynamic or based on business logic)
      const rewardDetails = {
        type: 'discount',
        amount: '10%'  // Example reward: 10% discount
      };
  
      res.json({
        valid: true,
        rewardDetails
      });
    } catch (error) {
      console.error('Error verifying referral code:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});


  
module.exports = router;
