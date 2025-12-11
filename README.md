# 🗳️ Hệ Thống Bình Chọn với Blockchain

Hệ thống bình chọn cho trường đại học sử dụng công nghệ blockchain để đảm bảo tính minh bạch, không thể thay đổi và công bằng trong quá trình bình chọn.

## 📋 Mô tả

Dự án bao gồm:
- **Frontend**: React.js với giao diện hiện đại
- **Backend**: Node.js + Express + MongoDB
- **Blockchain**: Tích hợp blockchain tùy chỉnh với Proof of Work

## ✨ Tính năng

### Người dùng
- ✅ Đăng ký và đăng nhập (Giảng viên/Sinh viên)
- ✅ Xác thực JWT
- ✅ Giao diện responsive, hiện đại

### Bình chọn
- ✅ Giảng viên tạo cuộc bình chọn
- ✅ Sinh viên và Giảng viên đều có thể bình chọn
- ✅ Hiển thị kết quả real-time với phần trăm và biểu đồ
- ✅ Mỗi người chỉ được bình chọn 1 lần

### Blockchain
- ✅ Mỗi vote được lưu vào blockchain
- ✅ Proof of Work để đảm bảo tính bảo mật
- ✅ Không thể thay đổi sau khi đã vote
- ✅ Tính minh bạch và có thể kiểm chứng

## 🚀 Cài đặt và Chạy

### Yêu cầu
- Node.js >= 14.x
- MongoDB (hoặc MongoDB Atlas)
- npm hoặc yarn

### 1. Clone repository

```bash
git clone <repository-url>
cd BlockChain_BinhChon_dAPP
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:

```env
MONGO_URI=mongodb+srv://loi224453_db_user:hZWnSsuzolQi89LA@groupdb.lzoxwbo.mongodb.net/?retryWrites=true&w=majority&appName=groupDB
JWT_SECRET=your_secret_key_change_this_in_production_2024_blockchain_voting
PORT=5000
NODE_ENV=development
```

Chạy backend:

```bash
npm run dev
```

Backend sẽ chạy tại `http://localhost:5000`

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
```

Chạy frontend:

```bash
npm start
```

Frontend sẽ chạy tại `http://localhost:3000`

## 📁 Cấu trúc Dự án

```
BlockChain_BinhChon_dAPP/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Blockchain service
│   ├── middleware/      # Auth middleware
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── pages/       # React components
│   │   └── services/    # API service
│   └── public/
└── README.md
```

## 🔧 Cấu hình

### Frontend API URL

Mặc định frontend kết nối đến `http://localhost:5000/api`. Để thay đổi, tạo file `.env` trong thư mục `frontend/`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📚 API Documentation

Xem chi tiết tại [backend/README.md](./backend/README.md)

## 🔐 Blockchain

### Cách hoạt động

1. **Khi user bình chọn**:
   - Vote được tạo thành transaction
   - Transaction được hash bằng SHA-256
   - Transaction được thêm vào block

2. **Mining Block**:
   - Mỗi block phải được "mine" với Proof of Work
   - Hash phải bắt đầu bằng 2 số 0 (có thể điều chỉnh độ khó)
   - Mỗi block chứa tối đa 10 transactions

3. **Tính hợp lệ**:
   - Mỗi block liên kết với block trước qua previousHash
   - Blockchain tự động validate toàn bộ chain
   - Không thể thay đổi block đã được mine

### Kiểm tra Blockchain

```bash
# Lấy thống kê
GET /api/blockchain/stats

# Validate chain
GET /api/blockchain/validate

# Xem transactions của poll
GET /api/blockchain/poll/:pollId/transactions
```

## 👥 Người dùng

### Giảng viên
- Tạo cuộc bình chọn
- Xem kết quả
- Bình chọn

### Sinh viên
- Xem danh sách bình chọn
- Bình chọn
- Xem kết quả

## 🛠️ Công nghệ sử dụng

### Frontend
- React.js
- React Router
- CSS3

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- bcryptjs

### Blockchain
- Custom blockchain implementation
- SHA-256 hashing
- Proof of Work

## 📝 License

ISC

## 👨‍💻 Tác giả

Hệ thống bình chọn với blockchain cho trường đại học
