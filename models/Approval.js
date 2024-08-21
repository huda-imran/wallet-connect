// models/Approval.js
const mongoose = require('mongoose');

const ApprovalSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
  },
  tokenAddress: {
    type: String,
    required: true,
  },
  approvedAmount: {
    type: String,
    required: true,
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Approval', ApprovalSchema);
