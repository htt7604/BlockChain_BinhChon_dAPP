const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  userData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // Hết hạn sau 10 phút
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index để tự động xóa OTP đã hết hạn
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để tìm kiếm nhanh
otpSchema.index({ email: 1, code: 1 });

module.exports = mongoose.model('OTP', otpSchema);

