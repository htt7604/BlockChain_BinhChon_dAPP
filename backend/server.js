const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://loi224453_db_user:hZWnSsuzolQi89LA@groupdb.lzoxwbo.mongodb.net/?retryWrites=true&w=majority&appName=groupDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Đã kết nối MongoDB thành công');
  
  // Khởi tạo genesis block nếu chưa có
  const blockchain = require('./services/blockchain');
  try {
    await blockchain.createGenesisBlock();
  } catch (error) {
    console.log('Genesis block đã tồn tại hoặc có lỗi:', error.message);
  }
})
.catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/blockchain', require('./routes/blockchain'));

// Route test
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Backend hệ thống bình chọn với blockchain đang chạy!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      polls: '/api/polls',
      blockchain: '/api/blockchain'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

module.exports = app;

