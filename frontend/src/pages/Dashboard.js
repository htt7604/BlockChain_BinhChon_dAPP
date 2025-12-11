import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, pollsAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    options: ['', '']
  });

  useEffect(() => {
    // Kiểm tra đăng nhập
    const loadUser = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user) {
          // Thử lấy từ API
          const response = await authAPI.getCurrentUser();
          if (response.success) {
            setCurrentUser(response.user);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          } else {
            navigate('/');
            return;
          }
        } else {
          setCurrentUser(user);
        }
        
        // Load polls từ API
        await loadPolls();
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        navigate('/');
      }
    };

    loadUser();
  }, [navigate]);

  const loadPolls = async () => {
    try {
      const response = await pollsAPI.getAll();
      if (response.success) {
        setPolls(response.polls);
      }
    } catch (error) {
      console.error('Lỗi khi tải polls:', error);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const handleVote = async (pollId, optionIndex) => {
    if (!currentUser) return;

    try {
      const response = await pollsAPI.vote(pollId, optionIndex);
      
      if (response.success) {
        // Reload polls để cập nhật dữ liệu
        await loadPolls();
        alert('Bình chọn thành công! Vote của bạn đã được lưu vào blockchain.');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi bình chọn!');
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    
    if (!newPoll.title.trim() || !newPoll.description.trim()) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (newPoll.options.filter(opt => opt.trim()).length < 2) {
      alert('Phải có ít nhất 2 lựa chọn!');
      return;
    }

    try {
      const pollData = {
        title: newPoll.title,
        description: newPoll.description,
        options: newPoll.options.filter(opt => opt.trim())
      };

      const response = await pollsAPI.create(pollData);
      
      if (response.success) {
        // Reload polls
        await loadPolls();

        // Reset form
        setNewPoll({
          title: '',
          description: '',
          options: ['', '']
        });
        setShowCreatePoll(false);
        alert('Tạo cuộc bình chọn thành công!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi tạo poll!');
    }
  };

  const addOption = () => {
    setNewPoll({
      ...newPoll,
      options: [...newPoll.options, '']
    });
  };

  const removeOption = (index) => {
    if (newPoll.options.length > 2) {
      const newOptions = newPoll.options.filter((_, i) => i !== index);
      setNewPoll({
        ...newPoll,
        options: newOptions
      });
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...newPoll.options];
    newOptions[index] = value;
    setNewPoll({
      ...newPoll,
      options: newOptions
    });
  };

  const hasUserVoted = (poll) => {
    return poll.userVoted || false;
  };

  const getVotePercentage = (poll, optionIndex) => {
    if (poll.optionPercentages && poll.optionPercentages[optionIndex] !== undefined) {
      return poll.optionPercentages[optionIndex];
    }
    return 0;
  };

  if (!currentUser) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>HỆ THỐNG BÌNH CHỌN</h1>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">
                {currentUser.role === 'teacher' ? '👨‍🏫 Giảng Viên' : '🎓 Sinh Viên'}
              </span>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Đăng Xuất
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          {currentUser.role === 'teacher' && (
            <div className="create-poll-section">
              <button 
                onClick={() => setShowCreatePoll(!showCreatePoll)}
                className="toggle-create-button"
              >
                {showCreatePoll ? '✕ Hủy' : '+ Tạo Cuộc Bình Chọn Mới'}
              </button>

              {showCreatePoll && (
                <form onSubmit={handleCreatePoll} className="create-poll-form">
                  <h3>Tạo Cuộc Bình Chọn Mới</h3>
                  
                  <div className="form-group">
                    <label>Tiêu đề</label>
                    <input
                      type="text"
                      value={newPoll.title}
                      onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                      placeholder="Nhập tiêu đề cuộc bình chọn"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea
                      value={newPoll.description}
                      onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                      placeholder="Nhập mô tả chi tiết"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Các lựa chọn</label>
                    {newPoll.options.map((option, index) => (
                      <div key={index} className="option-input-group">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Lựa chọn ${index + 1}`}
                          required={index < 2}
                        />
                        {newPoll.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="remove-option-button"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="add-option-button"
                    >
                      + Thêm lựa chọn
                    </button>
                  </div>

                  <button type="submit" className="submit-poll-button">
                    Tạo Cuộc Bình Chọn
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="polls-section">
            <h2>Danh Sách Cuộc Bình Chọn</h2>
            
            {polls.length === 0 ? (
              <div className="no-polls">
                <p>Chưa có cuộc bình chọn nào. {currentUser.role === 'teacher' && 'Hãy tạo cuộc bình chọn đầu tiên!'}</p>
              </div>
            ) : (
              <div className="polls-grid">
                {polls.map(poll => (
                  <div key={poll._id || poll.id} className="poll-card">
                    <div className="poll-header">
                      <h3>{poll.title}</h3>
                      <span className="poll-meta">
                        Bởi {poll.createdByName} • {new Date(poll.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    
                    <p className="poll-description">{poll.description}</p>
                    
                    <div className="poll-options">
                      {poll.options.map((option, index) => {
                        const voted = hasUserVoted(poll);
                        const percentage = getVotePercentage(poll, index);
                        const userVoteOption = poll.userVoteOption;

                        return (
                          <div
                            key={index}
                            className={`poll-option ${voted && userVoteOption === index ? 'user-voted' : ''} ${voted ? 'disabled' : ''}`}
                            onClick={() => !voted && handleVote(poll._id || poll.id, index)}
                          >
                            <div className="option-content">
                              <span className="option-text">{option}</span>
                              {voted && (
                                <span className="option-percentage">{percentage}%</span>
                              )}
                            </div>
                            {voted && (
                              <div className="option-bar">
                                <div
                                  className="option-bar-fill"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="poll-footer">
                      <span className="total-votes">
                        Tổng số phiếu: {poll.totalVotes || poll.votes?.length || 0}
                      </span>
                      {hasUserVoted(poll) && (
                        <span className="voted-badge">✓ Đã bình chọn</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

