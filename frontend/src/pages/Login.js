import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'student';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // useEffect(() => {
  //   // Load saved credentials if remember me was checked
  //   const savedEmail = localStorage.getItem(`${role}_email`);
  //   const savedPassword = localStorage.getItem(`${role}_password`);
  //   if (savedEmail && savedPassword) {
  //     setFormData({ email: savedEmail, password: savedPassword });
  //     setRememberMe(true);
  //   }
  // }, [role]);

  useEffect(() => {
  // Tạo user mặc định nếu chưa có
  const users = JSON.parse(localStorage.getItem('users') || '[]');

  if (users.length === 0) {
    const defaultUsers = [
      { id: 1, email: '1@gmail.com', password: '1', name: 'Teacher One', role: 'teacher' },
      { id: 2, email: '2@gmail.com', password: '2', name: 'Student Two', role: 'student' }
    ];

    localStorage.setItem('users', JSON.stringify(defaultUsers));
    console.log("Đã tạo user test mặc định");
  }

  // Load saved credentials
  const savedEmail = localStorage.getItem(`${role}_email`);
  const savedPassword = localStorage.getItem(`${role}_password`);
  if (savedEmail && savedPassword) {
    setFormData({ email: savedEmail, password: savedPassword });
    setRememberMe(true);
  }
}, [role]);


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Kiểm tra dữ liệu đăng nhập từ localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(
      u => u.email === formData.email && 
           u.password === formData.password && 
           u.role === role
    );

    if (user) {
      // Lưu thông tin đăng nhập
      if (rememberMe) {
        localStorage.setItem(`${role}_email`, formData.email);
        localStorage.setItem(`${role}_password`, formData.password);
      } else {
        localStorage.removeItem(`${role}_email`);
        localStorage.removeItem(`${role}_password`);
      }
      
      // Lưu user hiện tại
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Chuyển đến trang dashboard
      navigate('/dashboard');
    } else {
      setError('Email hoặc mật khẩu không đúng!');
    }
  };

  const goToRegister = () => {
    navigate(`/register?role=${role}`);
  };

  const goBack = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button className="back-button" onClick={goBack}>
          ← Quay lại
        </button>
        
        <div className="login-header">
          <div className="login-icon">
            {role === 'teacher' ? '👨‍🏫' : '🎓'}
          </div>
          <h2>Đăng Nhập</h2>
          <p>{role === 'teacher' ? 'Tài khoản Giảng Viên' : 'Tài khoản Sinh Viên'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email của bạn"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button type="submit" className="submit-button">
            Đăng Nhập
          </button>

          <div className="register-link">
            <p>Chưa có tài khoản? <span onClick={goToRegister}>Đăng ký ngay</span></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

