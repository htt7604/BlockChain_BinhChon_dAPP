const express = require('express');
const blockchain = require('../services/blockchain');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Lấy thống kê blockchain
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await blockchain.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê blockchain:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê blockchain',
      error: error.message
    });
  }
});

// Kiểm tra tính hợp lệ của blockchain
router.get('/validate', auth, async (req, res) => {
  try {
    const validation = await blockchain.validateChain();
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra blockchain:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra blockchain',
      error: error.message
    });
  }
});

// Lấy transactions của một poll
router.get('/poll/:pollId/transactions', auth, async (req, res) => {
  try {
    const transactions = await blockchain.getPollTransactions(req.params.pollId);
    res.json({
      success: true,
      transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Lỗi khi lấy transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy transactions',
      error: error.message
    });
  }
});

// Tạo genesis block (nếu chưa có)
router.post('/genesis', auth, async (req, res) => {
  try {
    const genesisBlock = await blockchain.createGenesisBlock();
    
    if (!genesisBlock) {
      return res.json({
        success: true,
        message: 'Genesis block đã tồn tại',
        genesisBlock: null
      });
    }

    res.json({
      success: true,
      message: 'Genesis block đã được tạo',
      genesisBlock
    });
  } catch (error) {
    console.error('Lỗi khi tạo genesis block:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo genesis block',
      error: error.message
    });
  }
});

module.exports = router;

