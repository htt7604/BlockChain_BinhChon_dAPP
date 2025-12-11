const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware để xác thực JWT token
const auth = async (req, res, next) => {
  try {
    // Lấy token từ header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không có token, truy cập bị từ chối' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_change_this_in_production_2024_blockchain_voting');
    
    // Tìm user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }

    // Gắn user vào request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token không hợp lệ',
      error: error.message 
    });
  }
};

// Middleware để kiểm tra role (chỉ teacher)
const requireTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ 
      success: false, 
      message: 'Chỉ có giảng viên mới được thực hiện hành động này' 
    });
  }
  next();
};

module.exports = { auth, requireTeacher };

