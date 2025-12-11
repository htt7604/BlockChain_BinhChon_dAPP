import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, pollsAPI } from '../services/api';
import { connectSocket, disconnectSocket, joinPollRoom, leavePollRoom, getSocket } from '../services/socket';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    options: ['', ''],
    isPrivate: false,
    startTime: '',
    endTime: ''
  });
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [expandedPoll, setExpandedPoll] = useState(null);

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
        
        // Kết nối Socket.io
        connectSocket();
        
        // Load polls từ API
        await loadPolls();
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        navigate('/');
      }
    };

    loadUser();

    // Cleanup khi unmount
    return () => {
      disconnectSocket();
    };
  }, [navigate]);

  // Lắng nghe socket events cho real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePollUpdated = (data) => {
      setPolls(prevPolls => {
        return prevPolls.map(poll => {
          if (poll._id === data.pollId || poll.id === data.pollId) {
            return {
              ...poll,
              totalVotes: data.totalVotes,
              optionVotes: data.optionVotes,
              optionPercentages: data.optionPercentages,
              votes: data.votes || poll.votes,
              userVoted: poll.userVoted || false
            };
          }
          return poll;
        });
      });
    };

    const handleNewPoll = (data) => {
      if (data.poll) {
        loadPolls(); // Reload để có đầy đủ thông tin
      }
    };

    socket.on('poll-updated', handlePollUpdated);
    socket.on('new-poll', handleNewPoll);

    return () => {
      socket.off('poll-updated', handlePollUpdated);
      socket.off('new-poll', handleNewPoll);
    };
  }, []);

  // Join/Leave poll rooms khi polls thay đổi
  useEffect(() => {
    const socket = getSocket();
    if (!socket || polls.length === 0) return;

    // Join tất cả poll rooms
    polls.forEach(poll => {
      joinPollRoom(poll._id || poll.id);
    });

    // Cleanup khi polls thay đổi
    return () => {
      polls.forEach(poll => {
        leavePollRoom(poll._id || poll.id);
      });
    };
  }, [polls.length]);

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
        // Cập nhật polls (socket sẽ tự động cập nhật real-time)
        await loadPolls();
        alert('Bình chọn thành công! Vote của bạn đã được lưu vào blockchain.');
      }
    } catch (error) {
      if (error.message.includes('mã tham gia')) {
        // Hiển thị modal nhập mã tham gia
        setSelectedPoll(polls.find(p => (p._id || p.id) === pollId));
        setShowAccessCodeModal(true);
      } else {
        alert(error.message || 'Có lỗi xảy ra khi bình chọn!');
      }
    }
  };

  const handleJoinPoll = async () => {
    if (!selectedPoll || !accessCode.trim()) {
      alert('Vui lòng nhập mã tham gia!');
      return;
    }

    try {
      const response = await pollsAPI.joinPoll(selectedPoll._id || selectedPoll.id, accessCode);
      if (response.success) {
        alert('Tham gia poll thành công!');
        setShowAccessCodeModal(false);
        setAccessCode('');
        setSelectedPoll(null);
        await loadPolls();
      }
    } catch (error) {
      alert(error.message || 'Mã tham gia không đúng!');
    }
  };

  const toggleVoteHistory = (pollId) => {
    if (expandedPoll === pollId) {
      setExpandedPoll(null);
    } else {
      setExpandedPoll(pollId);
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

    if (!newPoll.endTime) {
      alert('Vui lòng chọn thời gian kết thúc bình chọn!');
      return;
    }

    const startTime = newPoll.startTime ? new Date(newPoll.startTime) : new Date();
    const endTime = new Date(newPoll.endTime);

    if (endTime <= startTime) {
      alert('Thời gian kết thúc phải sau thời gian bắt đầu!');
      return;
    }

    try {
      const pollData = {
        title: newPoll.title,
        description: newPoll.description,
        options: newPoll.options.filter(opt => opt.trim()),
        isPrivate: newPoll.isPrivate,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      const response = await pollsAPI.create(pollData);
      
      if (response.success) {
        // Reload polls
        await loadPolls();

        // Reset form
        setNewPoll({
          title: '',
          description: '',
          options: ['', ''],
          isPrivate: false,
          startTime: '',
          endTime: ''
        });
        setShowCreatePoll(false);
        
        let message = 'Tạo cuộc bình chọn thành công!';
        if (response.poll && response.poll.accessCode) {
          message += `\n\nMã tham gia: ${response.poll.accessCode}\n\nHãy lưu lại mã này để chia sẻ với người tham gia!`;
        }
        alert(message);
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi tạo poll!');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPollStatus = (poll) => {
    const now = new Date();
    const start = new Date(poll.startTime);
    const end = new Date(poll.endTime);

    if (now < start) return { text: 'Sắp bắt đầu', class: 'status-upcoming' };
    if (now >= start && now <= end) return { text: 'Đang diễn ra', class: 'status-active' };
    return { text: 'Đã kết thúc', class: 'status-ended' };
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
                    <label>
                      <input
                        type="checkbox"
                        checked={newPoll.isPrivate}
                        onChange={(e) => setNewPoll({ ...newPoll, isPrivate: e.target.checked })}
                      />
                      <span style={{ marginLeft: '8px' }}>Poll riêng tư (cần mã tham gia)</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Thời gian bắt đầu (để trống = ngay bây giờ)</label>
                    <input
                      type="datetime-local"
                      value={newPoll.startTime}
                      onChange={(e) => setNewPoll({ ...newPoll, startTime: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Thời gian kết thúc *</label>
                    <input
                      type="datetime-local"
                      value={newPoll.endTime}
                      onChange={(e) => setNewPoll({ ...newPoll, endTime: e.target.value })}
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
                {polls.map(poll => {
                  const status = getPollStatus(poll);
                  const isCreator = currentUser && (poll.createdBy?._id === currentUser.id || poll.createdBy === currentUser.id);
                  
                  return (
                  <div key={poll._id || poll.id} className="poll-card">
                    <div className="poll-header">
                      <div className="poll-header-top">
                        <h3>{poll.title}</h3>
                        <div className="poll-badges">
                          {poll.isPrivate ? (
                            <span className="badge badge-private">🔒 Riêng tư</span>
                          ) : (
                            <span className="badge badge-public">🌐 Công khai</span>
                          )}
                          <span className={`badge ${status.class}`}>{status.text}</span>
                        </div>
                      </div>
                      <span className="poll-meta">
                        Bởi {poll.createdByName} • {new Date(poll.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="poll-time-info">
                        <div className="time-item">
                          <strong>Bắt đầu:</strong> {formatDateTime(poll.startTime)}
                        </div>
                        <div className="time-item">
                          <strong>Kết thúc:</strong> {formatDateTime(poll.endTime)}
                        </div>
                        {poll.accessCode && isCreator && (
                          <div className="access-code-display">
                            <strong>Mã tham gia:</strong> <code>{poll.accessCode}</code>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="poll-description">{poll.description}</p>
                    
                    <div className="poll-options">
                      {poll.options.map((option, index) => {
                        const voted = hasUserVoted(poll);
                        const percentage = getVotePercentage(poll, index);
                        const userVoteOption = poll.userVoteOption;
                        const canVoteNow = poll.canVote && !voted && status.text === 'Đang diễn ra';

                        return (
                          <div
                            key={index}
                            className={`poll-option ${voted && userVoteOption === index ? 'user-voted' : ''} ${!canVoteNow ? 'disabled' : ''}`}
                            onClick={() => canVoteNow && handleVote(poll._id || poll.id, index)}
                            title={!canVoteNow ? (voted ? 'Bạn đã bình chọn' : status.text === 'Sắp bắt đầu' ? 'Poll chưa bắt đầu' : status.text === 'Đã kết thúc' ? 'Poll đã kết thúc' : 'Bạn chưa tham gia poll này') : ''}
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
                      <div className="footer-top">
                        <span className="total-votes">
                          Tổng số phiếu: {poll.totalVotes || poll.votes?.length || 0}
                        </span>
                        {hasUserVoted(poll) && (
                          <span className="voted-badge">✓ Đã bình chọn</span>
                        )}
                        {poll.canVote === false && !hasUserVoted(poll) && poll.status === 'active' && poll.isPrivate && (
                          <span className="need-access-badge">⚠️ Cần mã tham gia</span>
                        )}
                      </div>
                      {poll.votes && poll.votes.length > 0 && (
                        <div className="vote-history-section">
                          <button 
                            className="toggle-history-btn"
                            onClick={() => toggleVoteHistory(poll._id || poll.id)}
                          >
                            {expandedPoll === (poll._id || poll.id) ? '▼ Ẩn' : '▶ Xem'} lịch sử bình chọn ({poll.votes.length})
                          </button>
                          {expandedPoll === (poll._id || poll.id) && (
                            <div className="vote-history">
                              <h4>Lịch sử bình chọn (Blockchain)</h4>
                              <div className="vote-list">
                                {poll.votes.map((vote, idx) => (
                                  <div key={idx} className="vote-item">
                                    <div className="vote-user">
                                      <strong>{vote.userName || 'Unknown'}</strong>
                                      <span className="vote-email">{vote.userEmail || ''}</span>
                                    </div>
                                    <div className="vote-details">
                                      <span className="vote-option">→ {vote.optionText || poll.options[vote.optionIndex]}</span>
                                      <span className="vote-time">{formatDateTime(vote.votedAt)}</span>
                                    </div>
                                    <div className="vote-blockchain">
                                      <div className="tx-hash">
                                        <small>TX: {vote.transactionHash?.substring(0, 16)}...</small>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal nhập mã tham gia */}
      {showAccessCodeModal && (
        <div className="modal-overlay" onClick={() => setShowAccessCodeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Nhập mã tham gia</h3>
            <p>Poll này là riêng tư. Vui lòng nhập mã tham gia để tham gia bình chọn.</p>
            <div className="form-group">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã tham gia"
                maxLength="8"
                className="access-code-input"
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleJoinPoll} className="submit-button">
                Tham gia
              </button>
              <button onClick={() => {
                setShowAccessCodeModal(false);
                setAccessCode('');
                setSelectedPoll(null);
              }} className="cancel-button">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

