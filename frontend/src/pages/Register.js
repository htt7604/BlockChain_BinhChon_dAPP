import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Register.css';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'student';
  
  const [step, setStep] = useState(1); // 1: Nhập thông tin, 2: Nhập OTP
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    teacherId: ''
  });
  
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  // Gửi OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      setLoading(false);
      return;
    }

    try {
      // Gọi API gửi OTP
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: role,
        studentId: role === 'student' ? formData.studentId : '',
        teacherId: role === 'teacher' ? formData.teacherId : ''
      };

      const response = await authAPI.sendOTP(registerData);
      
      if (response.success) {
        setSuccess('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
        setStep(2); // Chuyển sang bước nhập OTP
        setCountdown(600); // 10 phút = 600 giây
        
        // Bắt đầu đếm ngược
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gửi OTP!');
    } finally {
      setLoading(false);
    }
  };

  // Xác thực OTP và hoàn tất đăng ký
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!otpCode || otpCode.length !== 6) {
      setError('Vui lòng nhập mã OTP 6 chữ số!');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.verifyOTP(formData.email, otpCode);
      
      if (response.success) {
        // Lưu user hiện tại
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
        
        setTimeout(() => {
          navigate(`/login?role=${role}`);
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Mã OTP không đúng hoặc đã hết hạn!');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại OTP
  const handleResendOTP = async () => {
    if (countdown > 0) {
      setError(`Vui lòng đợi ${Math.floor(countdown / 60)} phút ${countdown % 60} giây trước khi gửi lại!`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: role,
        studentId: role === 'student' ? formData.studentId : '',
        teacherId: role === 'teacher' ? formData.teacherId : ''
      };

      const response = await authAPI.sendOTP(registerData);
      
      if (response.success) {
        setSuccess('Đã gửi lại mã OTP. Vui lòng kiểm tra email!');
        setCountdown(600); // Reset countdown
        
        // Bắt đầu đếm ngược lại
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gửi lại OTP!');
    } finally {
      setLoading(false);
    }
  };

  // Format countdown
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="register-form">
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

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>

            <div className="login-link">
              <p>Đã có tài khoản? <span onClick={goToLogin}>Đăng nhập ngay</span></p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="register-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="otp-instruction">
              <p>Mã OTP đã được gửi đến email:</p>
              <p className="email-display">{formData.email}</p>
              <p className="otp-note">Vui lòng kiểm tra hộp thư và nhập mã OTP 6 chữ số</p>
            </div>

            <div className="form-group">
              <label htmlFor="otpCode">Mã OTP</label>
              <input
                type="text"
                id="otpCode"
                name="otpCode"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setError('');
                }}
                placeholder="Nhập mã OTP 6 chữ số"
                maxLength="6"
                required
                className="otp-input"
              />
              {countdown > 0 && (
                <p className="countdown-text">
                  Mã OTP còn hiệu lực trong: <strong>{formatCountdown(countdown)}</strong>
                </p>
              )}
            </div>

            <button type="submit" className="submit-button" disabled={loading || otpCode.length !== 6}>
              {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </button>

            <div className="resend-otp">
              <p>
                Không nhận được mã?{' '}
                <span 
                  onClick={handleResendOTP} 
                  className={countdown > 0 ? 'disabled-link' : 'resend-link'}
                  style={{ cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}
                >
                  {countdown > 0 ? `Gửi lại sau (${formatCountdown(countdown)})` : 'Gửi lại mã OTP'}
                </span>
              </p>
            </div>

            <div className="back-to-form">
              <span onClick={() => {
                setStep(1);
                setOtpCode('');
                setError('');
                setSuccess('');
                setCountdown(0);
              }} className="back-link">
                ← Quay lại điền thông tin
              </span>
            </div>

            <div className="login-link">
              <p>Đã có tài khoản? <span onClick={goToLogin}>Đăng nhập ngay</span></p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;

