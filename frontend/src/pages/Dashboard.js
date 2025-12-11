import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
      navigate('/');
      return;
    }
    setCurrentUser(user);

    // Load polls từ localStorage
    loadPolls();
  }, [navigate]);

  const loadPolls = () => {
    const savedPolls = JSON.parse(localStorage.getItem('polls') || '[]');
    setPolls(savedPolls);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const handleVote = (pollId, optionIndex) => {
    if (!currentUser) return;

    const updatedPolls = polls.map(poll => {
      if (poll.id === pollId) {
        // Kiểm tra xem user đã vote chưa
        const hasVoted = poll.votes && poll.votes.some(v => v.userId === currentUser.id);
        if (hasVoted) {
          alert('Bạn đã bình chọn cho cuộc khảo sát này rồi!');
          return poll;
        }

        const votes = poll.votes || [];
        votes.push({
          userId: currentUser.id,
          userEmail: currentUser.email,
          optionIndex: optionIndex,
          votedAt: new Date().toISOString()
        });

        return {
          ...poll,
          votes: votes,
          optionVotes: {
            ...poll.optionVotes,
            [optionIndex]: (poll.optionVotes?.[optionIndex] || 0) + 1
          }
        };
      }
      return poll;
    });

    setPolls(updatedPolls);
    localStorage.setItem('polls', JSON.stringify(updatedPolls));
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    
    if (!newPoll.title.trim() || !newPoll.description.trim()) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (newPoll.options.filter(opt => opt.trim()).length < 2) {
      alert('Phải có ít nhất 2 lựa chọn!');
      return;
    }

    const poll = {
      id: Date.now(),
      title: newPoll.title,
      description: newPoll.description,
      options: newPoll.options.filter(opt => opt.trim()),
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      votes: [],
      optionVotes: {}
    };

    const updatedPolls = [poll, ...polls];
    setPolls(updatedPolls);
    localStorage.setItem('polls', JSON.stringify(updatedPolls));

    // Reset form
    setNewPoll({
      title: '',
      description: '',
      options: ['', '']
    });
    setShowCreatePoll(false);
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
    if (!currentUser || !poll.votes) return false;
    return poll.votes.some(v => v.userId === currentUser.id);
  };

  const getVotePercentage = (poll, optionIndex) => {
    const totalVotes = poll.votes?.length || 0;
    if (totalVotes === 0) return 0;
    const optionVotes = poll.optionVotes?.[optionIndex] || 0;
    return Math.round((optionVotes / totalVotes) * 100);
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
                  <div key={poll.id} className="poll-card">
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
                        const userVote = poll.votes?.find(v => v.userId === currentUser.id);

                        return (
                          <div
                            key={index}
                            className={`poll-option ${voted && userVote?.optionIndex === index ? 'user-voted' : ''} ${voted ? 'disabled' : ''}`}
                            onClick={() => !voted && handleVote(poll.id, index)}
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
                        Tổng số phiếu: {poll.votes?.length || 0}
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

