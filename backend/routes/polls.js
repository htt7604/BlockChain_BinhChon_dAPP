const express = require('express');
const Poll = require('../models/Poll');
const User = require('../models/User');
const blockchain = require('../services/blockchain');
const { auth, requireTeacher } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Hàm tạo mã tham gia ngẫu nhiên
const generateAccessCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Tạo poll mới (chỉ teacher)
router.post('/', auth, requireTeacher, async (req, res) => {
  try {
    const { title, description, options, isPrivate, startTime, endTime } = req.body;

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

    if (!endTime) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn thời gian kết thúc bình chọn'
      });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
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

    // Tạo mã tham gia nếu là private
    let accessCode = null;
    if (isPrivate) {
      accessCode = generateAccessCode();
    }

    // Tạo poll mới
    const poll = new Poll({
      title,
      description,
      options: validOptions,
      createdBy: req.user._id,
      createdByName: req.user.name,
      optionVotes: Object.fromEntries(optionVotes),
      isPrivate: isPrivate || false,
      accessCode: accessCode,
      startTime: start,
      endTime: end
    });

    await poll.save();

    // Emit socket event để thông báo poll mới
    const io = req.app.get('io');
    if (io) {
      io.emit('new-poll', { poll });
    }

    res.status(201).json({
      success: true,
      message: 'Tạo cuộc bình chọn thành công',
      poll: {
        ...poll.toObject(),
        accessCode: accessCode // Trả về access code cho teacher
      }
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

// Lấy tất cả polls (chỉ public hoặc user đã tham gia)
router.get('/', auth, async (req, res) => {
  try {
    // Lấy tất cả polls public hoặc user đã tham gia (có trong participants)
    const polls = await Poll.find({ 
      isActive: true,
      $or: [
        { isPrivate: false },
        { participants: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .exec();

    const now = new Date();

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

      // Trạng thái poll
      pollObj.status = 'upcoming';
      if (now >= new Date(poll.startTime) && now <= new Date(poll.endTime)) {
        pollObj.status = 'active';
      } else if (now > new Date(poll.endTime)) {
        pollObj.status = 'ended';
      }

      // Kiểm tra user có thể vote không
      pollObj.canVote = !pollObj.userVoted && 
                       pollObj.status === 'active' && 
                       (pollObj.isPrivate ? poll.participants.includes(req.user._id) : true);

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

// Lấy một poll cụ thể với lịch sử votes đầy đủ
router.get('/:id', auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('votes.userId', 'name email')
      .exec();

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy poll'
      });
    }

    // Kiểm tra quyền xem (nếu private)
    if (poll.isPrivate && !poll.participants.includes(req.user._id) && poll.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa tham gia poll này. Vui lòng nhập mã tham gia.'
      });
    }

    const pollObj = poll.toObject();
    const totalVotes = poll.votes.length;
    const now = new Date();
    
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

    // Trạng thái poll
    pollObj.status = 'upcoming';
    if (now >= new Date(poll.startTime) && now <= new Date(poll.endTime)) {
      pollObj.status = 'active';
    } else if (now > new Date(poll.endTime)) {
      pollObj.status = 'ended';
    }

    // Lịch sử votes (công khai, như blockchain)
    pollObj.voteHistory = poll.votes.map(vote => ({
      _id: vote._id,
      userName: vote.userName || (vote.userId?.name || 'Unknown'),
      userEmail: vote.userEmail || (vote.userId?.email || ''),
      optionText: vote.optionText,
      optionIndex: vote.optionIndex,
      transactionHash: vote.transactionHash,
      blockHash: vote.blockHash,
      votedAt: vote.votedAt
    })).sort((a, b) => new Date(b.votedAt) - new Date(a.votedAt)); // Sắp xếp mới nhất trước

    // Ẩn access code nếu không phải người tạo
    if (poll.createdBy.toString() !== req.user._id.toString()) {
      pollObj.accessCode = undefined;
    }

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

// Join poll với access code (cho private polls)
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy poll'
      });
    }

    if (!poll.isPrivate) {
      return res.status(400).json({
        success: false,
        message: 'Poll này là công khai, không cần mã tham gia'
      });
    }

    if (poll.accessCode !== accessCode) {
      return res.status(400).json({
        success: false,
        message: 'Mã tham gia không đúng'
      });
    }

    // Kiểm tra đã tham gia chưa
    if (poll.participants.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã tham gia poll này rồi'
      });
    }

    // Thêm user vào participants
    poll.participants.push(req.user._id);
    await poll.save();

    res.json({
      success: true,
      message: 'Tham gia poll thành công'
    });
  } catch (error) {
    console.error('Lỗi khi join poll:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tham gia poll',
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

    const poll = await Poll.findById(pollId)
      .populate('votes.userId', 'name email')
      .exec();

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

    // Kiểm tra thời gian bình chọn
    const now = new Date();
    if (now < new Date(poll.startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Poll chưa bắt đầu'
      });
    }

    if (now > new Date(poll.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Poll đã kết thúc'
      });
    }

    // Kiểm tra private poll - user phải tham gia
    if (poll.isPrivate && !poll.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa tham gia poll này. Vui lòng nhập mã tham gia.'
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

    // Tạo vote object với thông tin user
    const vote = {
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      optionIndex: optionIndex,
      optionText: poll.options[optionIndex],
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
    const updatedPoll = await Poll.findById(pollId).exec();
    
    const totalVotes = updatedPoll.votes.length;

    // Tính phần trăm
    const optionPercentages = {};
    updatedPoll.options.forEach((_, index) => {
      const votes = updatedPoll.optionVotes.get(index.toString()) || 0;
      optionPercentages[index] = totalVotes > 0 
        ? Math.round((votes / totalVotes) * 100) 
        : 0;
    });

    // Emit socket event để cập nhật real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`poll-${pollId}`).emit('poll-updated', {
        pollId: pollId,
        vote: vote,
        totalVotes: totalVotes,
        optionVotes: Object.fromEntries(updatedPoll.optionVotes),
        optionPercentages: optionPercentages,
        votes: updatedPoll.votes.map(v => ({
          _id: v._id,
          userId: v.userId,
          userName: v.userName,
          userEmail: v.userEmail,
          optionIndex: v.optionIndex,
          optionText: v.optionText,
          transactionHash: v.transactionHash,
          blockHash: v.blockHash,
          votedAt: v.votedAt
        }))
      });
    }

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

