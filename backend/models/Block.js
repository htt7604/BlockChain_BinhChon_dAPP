const mongoose = require('mongoose');
const crypto = require('crypto');

const transactionSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  optionIndex: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  }
});

const blockSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
    unique: true
  },
  previousHash: {
    type: String,
    required: true
  },
  transactions: [transactionSchema],
  timestamp: {
    type: Date,
    default: Date.now
  },
  hash: {
    type: String,
    required: true,
    unique: true
  },
  nonce: {
    type: Number,
    default: 0
  }
});

// Method để tính hash của block
blockSchema.methods.calculateHash = function() {
  const data = this.index + this.previousHash + JSON.stringify(this.transactions) + this.timestamp + this.nonce;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Method để mine block (Proof of Work đơn giản)
blockSchema.methods.mineBlock = function(difficulty = 2) {
  const target = Array(difficulty + 1).join('0');
  
  while (this.hash.substring(0, difficulty) !== target) {
    this.nonce++;
    this.hash = this.calculateHash();
  }
};

module.exports = mongoose.model('Block', blockSchema);

