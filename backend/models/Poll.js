const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  optionIndex: {
    type: Number,
    required: true
  },
  blockHash: {
    type: String,
    required: true
  },
  transactionHash: {
    type: String,
    required: true
  },
  votedAt: {
    type: Date,
    default: Date.now
  }
});

const pollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tiêu đề'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Vui lòng nhập mô tả'],
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  votes: [voteSchema],
  optionVotes: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Index để tìm kiếm nhanh
pollSchema.index({ createdAt: -1 });
pollSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Poll', pollSchema);

