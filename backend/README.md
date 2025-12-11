# Backend - Hệ Thống Bình Chọn với Blockchain

## 📋 Mô tả

Backend cho hệ thống bình chọn đại học sử dụng Node.js, Express, MongoDB và tích hợp blockchain để đảm bảo tính minh bạch và không thể thay đổi của các phiếu bầu.

## 🚀 Tính năng

- ✅ Đăng ký và đăng nhập người dùng (Giảng viên/Sinh viên)
- ✅ Tạo và quản lý cuộc bình chọn (chỉ Giảng viên)
- ✅ Bình chọn với tích hợp blockchain
- ✅ Blockchain với Proof of Work
- ✅ Xác thực JWT
- ✅ API RESTful đầy đủ

## 📦 Cài đặt

### 1. Cài đặt dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` trong thư mục `backend/`:

```env
MONGO_URI=mongodb+srv://loi224453_db_user:hZWnSsuzolQi89LA@groupdb.lzoxwbo.mongodb.net/?retryWrites=true&w=majority&appName=groupDB
JWT_SECRET=your_secret_key_change_this_in_production_2024_blockchain_voting
PORT=5000
NODE_ENV=development
```

### 3. Chạy server

```bash
# Development mode (với nodemon)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại `http://localhost:5000`

## 📚 API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Polls (`/api/polls`)

- `GET /api/polls` - Lấy tất cả polls (yêu cầu auth)
- `GET /api/polls/:id` - Lấy một poll cụ thể
- `POST /api/polls` - Tạo poll mới (chỉ teacher, yêu cầu auth)
- `POST /api/polls/:id/vote` - Bình chọn (yêu cầu auth)
- `DELETE /api/polls/:id` - Xóa poll (chỉ teacher tạo poll, yêu cầu auth)

### Blockchain (`/api/blockchain`)

- `GET /api/blockchain/stats` - Lấy thống kê blockchain
- `GET /api/blockchain/validate` - Kiểm tra tính hợp lệ blockchain
- `GET /api/blockchain/poll/:pollId/transactions` - Lấy transactions của poll
- `POST /api/blockchain/genesis` - Tạo genesis block

## 🔐 Blockchain Implementation

### Tính năng

1. **Genesis Block**: Block đầu tiên trong chuỗi
2. **Proof of Work**: Mỗi block phải được "mine" với độ khó 2 (2 số 0 ở đầu hash)
3. **Transaction Hash**: Mỗi vote được mã hóa thành transaction hash duy nhất
4. **Block Validation**: Tự động kiểm tra tính hợp lệ của toàn bộ chain

### Cấu trúc Block

```javascript
{
  index: Number,           // Vị trí block trong chain
  previousHash: String,    // Hash của block trước
  transactions: Array,     // Danh sách transactions (votes)
  timestamp: Date,         // Thời gian tạo block
  hash: String,            // Hash của block (SHA-256)
  nonce: Number            // Số dùng cho Proof of Work
}
```

### Cấu trúc Transaction

```javascript
{
  pollId: ObjectId,        // ID của poll
  userId: ObjectId,        // ID của user bình chọn
  optionIndex: Number,     // Lựa chọn được bình chọn
  timestamp: Date,         // Thời gian bình chọn
  transactionHash: String  // Hash của transaction
}
```

## 🗄️ Database Models

### User Model
- name, email, password (hashed)
- role: 'teacher' | 'student'
- studentId hoặc teacherId
- createdAt

### Poll Model
- title, description
- options: Array<String>
- createdBy, createdByName
- votes: Array<Vote>
- optionVotes: Map<Number, Number>
- createdAt, isActive

### Block Model
- index, previousHash, hash
- transactions: Array<Transaction>
- timestamp, nonce

## 🔒 Bảo mật

- Passwords được hash bằng bcrypt
- JWT tokens cho authentication
- Middleware kiểm tra quyền (teacher/student)
- Transaction hash đảm bảo tính duy nhất của mỗi vote

## 📝 Lưu ý

- Mỗi user chỉ có thể vote 1 lần cho mỗi poll
- Mỗi block chứa tối đa 10 transactions
- Blockchain tự động tạo genesis block khi khởi động
- Tất cả votes đều được lưu vào blockchain để đảm bảo tính minh bạch

