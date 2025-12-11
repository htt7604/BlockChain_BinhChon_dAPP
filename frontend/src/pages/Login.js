import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
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

  useEffect(() => {
    // Load saved credentials if remember me was checked
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Gọi API đăng nhập
      const response = await authAPI.login(formData.email, formData.password, role);
      
      if (response.success) {
        // Lưu thông tin đăng nhập
        if (rememberMe) {
          localStorage.setItem(`${role}_email`, formData.email);
        } else {
          localStorage.removeItem(`${role}_email`);
          localStorage.removeItem(`${role}_password`);
        }
        
        // Lưu user hiện tại
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        // Chuyển đến trang dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Email hoặc mật khẩu không đúng!');
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
