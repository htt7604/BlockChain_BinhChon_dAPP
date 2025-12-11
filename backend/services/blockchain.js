const Block = require('../models/Block');
const crypto = require('crypto');

class Blockchain {
  constructor() {
    this.difficulty = 2; // Độ khó cho Proof of Work
  }

  // Tạo transaction hash
  createTransactionHash(pollId, userId, optionIndex, timestamp) {
    const data = `${pollId}${userId}${optionIndex}${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Lấy block cuối cùng
  async getLatestBlock() {
    const latestBlock = await Block.findOne().sort({ index: -1 }).exec();
    return latestBlock;
  }

  // Tạo block mới (Genesis block nếu là block đầu tiên)
  async createGenesisBlock() {
    const existingBlocks = await Block.countDocuments();
    if (existingBlocks > 0) {
      return null; // Đã có genesis block
    }

    const genesisBlock = new Block({
      index: 0,
      previousHash: '0'.repeat(64),
      transactions: [],
      timestamp: new Date(),
      nonce: 0
    });
    
    genesisBlock.hash = genesisBlock.calculateHash();
    await genesisBlock.save();
    console.log('✅ Genesis block đã được tạo');
    return genesisBlock;
  }

  // Thêm transaction vào blockchain
  async addTransaction(pollId, userId, optionIndex) {
    try {
      // Tạo transaction hash
      const timestamp = new Date();
      const transactionHash = this.createTransactionHash(pollId, userId, optionIndex, timestamp);

      // Kiểm tra transaction đã tồn tại chưa
      const existingTransaction = await Block.findOne({
        'transactions.transactionHash': transactionHash
      });

      if (existingTransaction) {
        throw new Error('Transaction đã tồn tại trong blockchain');
      }

      // Lấy block cuối cùng
      let latestBlock = await this.getLatestBlock();

      // Nếu chưa có block nào, tạo genesis block
      if (!latestBlock) {
        latestBlock = await this.createGenesisBlock();
      }

      // Tạo transaction
      const transaction = {
        pollId: pollId,
        userId: userId,
        optionIndex: optionIndex,
        timestamp: timestamp,
        transactionHash: transactionHash
      };

      // Tạo block mới nếu block hiện tại đã có nhiều transactions (giới hạn 10 transactions/block)
      let newBlock;
      if (latestBlock.transactions.length >= 10) {
        // Tạo block mới
        newBlock = new Block({
          index: latestBlock.index + 1,
          previousHash: latestBlock.hash,
          transactions: [transaction],
          timestamp: new Date(),
          nonce: 0
        });
        
        // Mine block
        newBlock.hash = newBlock.calculateHash();
        newBlock.mineBlock(this.difficulty);
        await newBlock.save();
      } else {
        // Thêm transaction vào block hiện tại
        latestBlock.transactions.push(transaction);
        // Reset nonce và tính lại hash, sau đó mine lại
        latestBlock.nonce = 0;
        latestBlock.hash = latestBlock.calculateHash();
        latestBlock.mineBlock(this.difficulty);
        await latestBlock.save();
        newBlock = latestBlock;
      }

      return {
        transactionHash: transactionHash,
        blockHash: newBlock.hash,
        blockIndex: newBlock.index
      };
    } catch (error) {
      console.error('Lỗi khi thêm transaction vào blockchain:', error);
      throw error;
    }
  }

  // Lấy tất cả transactions của một poll
  async getPollTransactions(pollId) {
    const blocks = await Block.find({
      'transactions.pollId': pollId
    }).sort({ index: 1 }).exec();

    const transactions = [];
    blocks.forEach(block => {
      block.transactions.forEach(tx => {
        if (tx.pollId.toString() === pollId.toString()) {
          transactions.push({
            ...tx.toObject(),
            blockIndex: block.index,
            blockHash: block.hash
          });
        }
      });
    });

    return transactions;
  }

  // Kiểm tra tính hợp lệ của blockchain
  async validateChain() {
    const blocks = await Block.find().sort({ index: 1 }).exec();
    
    if (blocks.length === 0) {
      return { isValid: true, message: 'Chưa có block nào' };
    }

    // Kiểm tra genesis block
    if (blocks[0].index !== 0 || blocks[0].previousHash !== '0'.repeat(64)) {
      return { isValid: false, message: 'Genesis block không hợp lệ' };
    }

    // Kiểm tra các block còn lại
    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];

      // Kiểm tra previousHash
      if (currentBlock.previousHash !== previousBlock.hash) {
        return { 
          isValid: false, 
          message: `Block ${currentBlock.index} có previousHash không khớp` 
        };
      }

      // Kiểm tra hash của block
      const calculatedHash = currentBlock.calculateHash();
      if (currentBlock.hash !== calculatedHash) {
        return { 
          isValid: false, 
          message: `Block ${currentBlock.index} có hash không hợp lệ` 
        };
      }

      // Kiểm tra Proof of Work
      const target = Array(this.difficulty + 1).join('0');
      if (currentBlock.hash.substring(0, this.difficulty) !== target) {
        return { 
          isValid: false, 
          message: `Block ${currentBlock.index} không thỏa mãn Proof of Work` 
        };
      }
    }

    return { isValid: true, message: 'Blockchain hợp lệ', blockCount: blocks.length };
  }

  // Lấy thống kê blockchain
  async getStats() {
    const blockCount = await Block.countDocuments();
    const latestBlock = await this.getLatestBlock();
    const validation = await this.validateChain();

    // Đếm tổng số transactions
    const blocks = await Block.find().exec();
    let totalTransactions = 0;
    blocks.forEach(block => {
      totalTransactions += block.transactions.length;
    });

    return {
      blockCount,
      totalTransactions,
      latestBlockIndex: latestBlock ? latestBlock.index : -1,
      latestBlockHash: latestBlock ? latestBlock.hash : null,
      isValid: validation.isValid,
      message: validation.message
    };
  }
}

module.exports = new Blockchain();

