const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { auth } = require('../middleware/auth');
const { sendOTPEmail, generateOTP } = require('../services/emailService');

const router = express.Router();

// Gửi OTP khi đăng ký
router.post('/send-otp', async (req, res) => {
  try {
    const { name, email, password, role, studentId, teacherId } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    if (role !== 'teacher' && role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }

    if (role === 'student' && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã sinh viên'
      });
    }

    if (role === 'teacher' && !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã giảng viên'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng'
      });
    }

    // Kiểm tra có OTP chưa hết hạn không
    const existingOTP = await OTP.findOne({ 
      email, 
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    // Xóa OTP cũ nếu có
    if (existingOTP) {
      await OTP.deleteOne({ _id: existingOTP._id });
    }

    // Tạo mã OTP mới
    const otpCode = generateOTP();

    // Lưu thông tin user vào OTP (tạm thời)
    const userData = {
      name,
      email,
      password,
      role,
      studentId: role === 'student' ? studentId : '',
      teacherId: role === 'teacher' ? teacherId : ''
    };

    const otp = new OTP({
      email,
      code: otpCode,
      userData,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 phút
    });

    await otp.save();

    // Gửi email OTP
    try {
      await sendOTPEmail(email, otpCode, name);
      res.json({
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.'
      });
    } catch (emailError) {
      // Xóa OTP nếu gửi email thất bại
      await OTP.deleteOne({ _id: otp._id });
      throw emailError;
    }
  } catch (error) {
    console.error('Lỗi khi gửi OTP:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi gửi OTP',
      error: error.message
    });
  }
});

// Xác thực OTP và hoàn tất đăng ký
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mã OTP'
      });
    }

    // Tìm OTP
    const otp = await OTP.findOne({ 
      email: email.toLowerCase(),
      code: otpCode,
      verified: false
    });

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn'
      });
    }

    // Kiểm tra OTP đã hết hạn chưa
    if (otp.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otp._id });
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới'
      });
    }

    // Kiểm tra email đã được đăng ký chưa (trong trường hợp người khác đã đăng ký)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await OTP.deleteOne({ _id: otp._id });
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng'
      });
    }

    // Tạo user mới từ dữ liệu trong OTP
    const { name, password, role, studentId, teacherId } = otp.userData;

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      studentId: role === 'student' ? studentId : '',
      teacherId: role === 'teacher' ? teacherId : ''
    });

    await user.save();

    // Đánh dấu OTP đã được sử dụng
    otp.verified = true;
    await otp.save();

    // Xóa OTP đã sử dụng
    await OTP.deleteOne({ _id: otp._id });

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key_change_this_in_production_2024_blockchain_voting',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        teacherId: user.teacherId
      }
    });
  } catch (error) {
    console.error('Lỗi khi xác thực OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác thực OTP',
      error: error.message
    });
  }
});

// Đăng ký (giữ lại để tương thích, nhưng khuyến nghị dùng send-otp và verify-otp)
router.post('/register', async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Vui lòng sử dụng quy trình đăng ký với OTP: /api/auth/send-otp và /api/auth/verify-otp'
  });
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra role
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        message: 'Vai trò không khớp'
      });
    }

    // So sánh password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key_change_this_in_production_2024_blockchain_voting',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        teacherId: user.teacherId
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập',
      error: error.message
    });
  }
});

// Lấy thông tin user hiện tại
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        studentId: req.user.studentId,
        teacherId: req.user.teacherId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin user',
      error: error.message
    });
  }
});

module.exports = router;

