import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-card">
        <div className="logo-section">
          <h1 className="university-title">HỆ THỐNG BÌNH CHỌN</h1>
          <h2 className="university-subtitle">Trường Đại Học</h2>
        </div>
        
        <div className="role-buttons">
          <div className="role-card" onClick={() => handleRoleSelect('teacher')}>
            <div className="role-icon teacher-icon">👨‍🏫</div>
            <h3>Giảng Viên</h3>
            <p>Đăng nhập với tài khoản giảng viên</p>
          </div>
          
          <div className="role-card" onClick={() => handleRoleSelect('student')}>
            <div className="role-icon student-icon">🎓</div>
            <h3>Sinh Viên</h3>
            <p>Đăng nhập với tài khoản sinh viên</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;

