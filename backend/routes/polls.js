const express = require('express');
const Poll = require('../models/Poll');
const blockchain = require('../services/blockchain');
const { auth, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// Tạo poll mới (chỉ teacher)
router.post('/', auth, requireTeacher, async (req, res) => {
  try {
    const { title, description, options } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ tiêu đề và mô tả'
      });
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Phải có ít nhất 2 lựa chọn'
      });
    }

    // Lọc các option trống
    const validOptions = options.filter(opt => opt && opt.trim());

    if (validOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Phải có ít nhất 2 lựa chọn hợp lệ'
      });
    }

    // Khởi tạo optionVotes
    const optionVotes = new Map();
    validOptions.forEach((_, index) => {
      optionVotes.set(index.toString(), 0);
    });

    // Tạo poll mới
    const poll = new Poll({
      title,
      description,
      options: validOptions,
      createdBy: req.user._id,
      createdByName: req.user.name,
      optionVotes: Object.fromEntries(optionVotes)
    });

    await poll.save();

    res.status(201).json({
      success: true,
      message: 'Tạo cuộc bình chọn thành công',
      poll
    });
  } catch (error) {
    console.error('Lỗi khi tạo poll:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo poll',
      error: error.message
    });
  }
});

// Lấy tất cả polls
router.get('/', auth, async (req, res) => {
  try {
    const polls = await Poll.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .exec();

    // Tính toán số phiếu cho mỗi option và kiểm tra user đã vote chưa
    const pollsWithStats = polls.map(poll => {
      const pollObj = poll.toObject();
      const totalVotes = poll.votes.length;
      
      // Tính phần trăm cho mỗi option
      pollObj.optionPercentages = {};
      pollObj.options.forEach((_, index) => {
        const votes = poll.optionVotes.get(index.toString()) || 0;
        pollObj.optionPercentages[index] = totalVotes > 0 
          ? Math.round((votes / totalVotes) * 100) 
          : 0;
      });

      // Kiểm tra user đã vote chưa
      const userVote = poll.votes.find(
        v => v.userId.toString() === req.user._id.toString()
      );
      pollObj.userVoted = !!userVote;
      pollObj.userVoteOption = userVote ? userVote.optionIndex : null;

      return pollObj;
    });

    res.json({
      success: true,
      polls: pollsWithStats
    });
  } catch (error) {
    console.error('Lỗi khi lấy polls:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách polls',
      error: error.message
    });
  }
});

// Lấy một poll cụ thể
router.get('/:id', auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'name email')
      .exec();

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy poll'
      });
    }

    const pollObj = poll.toObject();
    const totalVotes = poll.votes.length;
    
    // Tính phần trăm
    pollObj.optionPercentages = {};
    pollObj.options.forEach((_, index) => {
      const votes = poll.optionVotes.get(index.toString()) || 0;
      pollObj.optionPercentages[index] = totalVotes > 0 
        ? Math.round((votes / totalVotes) * 100) 
        : 0;
    });

    // Kiểm tra user đã vote chưa
    const userVote = poll.votes.find(
      v => v.userId.toString() === req.user._id.toString()
    );
    pollObj.userVoted = !!userVote;
    pollObj.userVoteOption = userVote ? userVote.optionIndex : null;

    res.json({
      success: true,
      poll: pollObj
    });
  } catch (error) {
    console.error('Lỗi khi lấy poll:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy poll',
      error: error.message
    });
  }
});

// Bình chọn (vote)
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const pollId = req.params.id;

    // Validation
    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn một lựa chọn'
      });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy poll'
      });
    }

    if (!poll.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Poll này đã bị đóng'
      });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({
        success: false,
        message: 'Lựa chọn không hợp lệ'
      });
    }

    // Kiểm tra user đã vote chưa
    const existingVote = poll.votes.find(
      v => v.userId.toString() === req.user._id.toString()
    );

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã bình chọn cho poll này rồi'
      });
    }

    // Thêm vote vào blockchain
    let blockchainResult;
    try {
      blockchainResult = await blockchain.addTransaction(
        pollId,
        req.user._id,
        optionIndex
      );
    } catch (blockchainError) {
      console.error('Lỗi blockchain:', blockchainError);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lưu vào blockchain: ' + blockchainError.message
      });
    }

    // Tạo vote object
    const vote = {
      userId: req.user._id,
      optionIndex: optionIndex,
      blockHash: blockchainResult.blockHash,
      transactionHash: blockchainResult.transactionHash,
      votedAt: new Date()
    };

    // Thêm vote vào poll
    poll.votes.push(vote);

    // Cập nhật số phiếu
    const currentVotes = poll.optionVotes.get(optionIndex.toString()) || 0;
    poll.optionVotes.set(optionIndex.toString(), currentVotes + 1);

    await poll.save();

    // Lấy poll đã cập nhật
    const updatedPoll = await Poll.findById(pollId);
    const totalVotes = updatedPoll.votes.length;

    // Tính phần trăm
    const optionPercentages = {};
    updatedPoll.options.forEach((_, index) => {
      const votes = updatedPoll.optionVotes.get(index.toString()) || 0;
      optionPercentages[index] = totalVotes > 0 
        ? Math.round((votes / totalVotes) * 100) 
        : 0;
    });

    res.json({
      success: true,
      message: 'Bình chọn thành công',
      vote: {
        ...vote,
        transactionHash: blockchainResult.transactionHash,
        blockHash: blockchainResult.blockHash,
        blockIndex: blockchainResult.blockIndex
      },
      poll: {
        id: updatedPoll._id,
        totalVotes: totalVotes,
        optionVotes: Object.fromEntries(updatedPoll.optionVotes),
        optionPercentages: optionPercentages
      }
    });
  } catch (error) {
    console.error('Lỗi khi vote:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi bình chọn',
      error: error.message
    });
  }
});

// Xóa poll (chỉ teacher tạo poll đó)
router.delete('/:id', auth, requireTeacher, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy poll'
      });
    }

    // Chỉ người tạo mới được xóa
    if (poll.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa poll này'
      });
    }

    poll.isActive = false;
    await poll.save();

    res.json({
      success: true,
      message: 'Đã đóng poll thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa poll:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa poll',
      error: error.message
    });
  }
});

module.exports = router;

