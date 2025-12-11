import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'student';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    teacherId: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    // Kiểm tra email đã tồn tại chưa
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find(u => u.email === formData.email);

    if (existingUser) {
      setError('Email này đã được sử dụng!');
      return;
    }

    // Lưu thông tin đăng ký
    const newUser = {
      id: Date.now(),
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: role,
      studentId: role === 'student' ? formData.studentId : '',
      teacherId: role === 'teacher' ? formData.teacherId : '',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
    
    setTimeout(() => {
      navigate(`/login?role=${role}`);
    }, 2000);
  };

  const goToLogin = () => {
    navigate(`/login?role=${role}`);
  };

  const goBack = () => {
    navigate('/');
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <button className="back-button" onClick={goBack}>
          ← Quay lại
        </button>
        
        <div className="register-header">
          <div className="register-icon">
            {role === 'teacher' ? '👨‍🏫' : '🎓'}
          </div>
          <h2>Đăng Ký</h2>
          <p>{role === 'teacher' ? 'Tài khoản Giảng Viên' : 'Tài khoản Sinh Viên'}</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <div className="form-group">
            <label htmlFor="name">Họ và Tên</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              required
            />
          </div>

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

          {role === 'student' && (
            <div className="form-group">
              <label htmlFor="studentId">Mã Sinh Viên</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Nhập mã sinh viên"
                required
              />
            </div>
          )}

          {role === 'teacher' && (
            <div className="form-group">
              <label htmlFor="teacherId">Mã Giảng Viên</label>
              <input
                type="text"
                id="teacherId"
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                placeholder="Nhập mã giảng viên"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>

          <button type="submit" className="submit-button">
            Đăng Ký
          </button>

          <div className="login-link">
            <p>Đã có tài khoản? <span onClick={goToLogin}>Đăng nhập ngay</span></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

