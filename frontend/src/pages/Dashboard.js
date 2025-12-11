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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPoll, setEditingPoll] = useState(null);
  const [editPollData, setEditPollData] = useState(null);

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
      console.log('📡 Real-time update received:', data);
      setPolls(prevPolls => {
        return prevPolls.map(poll => {
          const pollIdStr = (poll._id || poll.id || '').toString();
          const dataPollIdStr = (data.pollId || '').toString();
          
          if (pollIdStr === dataPollIdStr) {
            return {
              ...poll,
              totalVotes: data.totalVotes,
              optionVotes: data.optionVotes,
              optionPercentages: data.optionPercentages,
              votes: data.votes || poll.votes || []
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

  const handlePollClick = (poll) => {
    // Kiểm tra nếu là người tạo
    const isCreator = currentUser && (poll.createdBy?._id === currentUser.id || poll.createdBy === currentUser.id);
    
    // Nếu poll là private và user chưa tham gia (và không phải người tạo), hiển thị modal nhập mã
    if (poll.isPrivate && !isCreator) {
      const isParticipant = poll.participants && poll.participants.some(p => {
        const pId = (p._id || p || '').toString();
        return pId === currentUser?.id;
      });
      
      if (!isParticipant) {
        setSelectedPoll(poll);
        setShowAccessCodeModal(true);
        return;
      }
    }
    
    // Mở trang chi tiết poll
    navigate(`/poll/${poll._id || poll.id}`);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadPolls();
      return;
    }

    try {
      const response = await pollsAPI.searchPolls(searchTerm);
      if (response.success) {
        setPolls(response.polls);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm:', error);
    }
  };

  const handleEditPoll = (poll) => {
    setEditingPoll(poll);
    setEditPollData({
      title: poll.title,
      description: poll.description,
      options: poll.options,
      isPrivate: poll.isPrivate,
      startTime: poll.startTime ? new Date(poll.startTime).toISOString().slice(0, 16) : '',
      endTime: poll.endTime ? new Date(poll.endTime).toISOString().slice(0, 16) : ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPoll || !editPollData) return;

    try {
      const response = await pollsAPI.updatePoll(editingPoll._id || editingPoll.id, editPollData);
      if (response.success) {
        alert('Chỉnh sửa poll thành công!');
        setEditingPoll(null);
        setEditPollData(null);
        await loadPolls();
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi chỉnh sửa poll!');
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
        const pollId = selectedPoll._id || selectedPoll.id;
        setAccessCode('');
        setSelectedPoll(null);
        await loadPolls();
        // Chuyển đến trang chi tiết poll
        navigate(`/poll/${pollId}`);
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
            <div className="section-header">
              <h2>Danh Sách Cuộc Bình Chọn</h2>
              {currentUser.role === 'student' && (
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Tìm kiếm phòng bình chọn..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="search-input"
                  />
                  <button onClick={handleSearch} className="search-button">
                    🔍 Tìm kiếm
                  </button>
                </div>
              )}
            </div>
            
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
                        <h3 onClick={() => handlePollClick(poll)} style={{ cursor: 'pointer' }}>{poll.title}</h3>
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
                            <small> (Chia sẻ mã này với sinh viên để tham gia)</small>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="poll-description">{poll.description}</p>

                    {isCreator && status.text === 'Sắp bắt đầu' && (
                      <div className="poll-actions">
                        <button onClick={() => handleEditPoll(poll)} className="edit-poll-button">
                          ✏️ Chỉnh sửa poll
                        </button>
                      </div>
                    )}

                    <div className="poll-preview-info">
                      <div className="preview-stats">
                        <span>📊 {poll.totalVotes || poll.votes?.length || 0} phiếu</span>
                        <span>📝 {poll.options.length} lựa chọn</span>
                        {hasUserVoted(poll) && <span className="voted-badge">✓ Đã bình chọn</span>}
                      </div>
                      <button 
                        onClick={() => handlePollClick(poll)} 
                        className="view-poll-button"
                      >
                        {poll.isPrivate && !isCreator && poll.participants && !poll.participants.some(p => {
                          const pId = (p._id || p || '').toString();
                          return pId === currentUser?.id;
                        })
                          ? '🔓 Nhập mã tham gia' 
                          : '👉 Xem chi tiết & Bình chọn'}
                      </button>
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
            <h3>Nhập mã tham gia phòng bình chọn</h3>
            <p><strong>{selectedPoll?.title}</strong></p>
            <p>Poll này là riêng tư. Vui lòng nhập mã tham gia để tham gia bình chọn.</p>
            <div className="form-group">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã tham gia (8 ký tự)"
                maxLength="8"
                className="access-code-input"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinPoll()}
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

      {/* Modal chỉnh sửa poll */}
      {editingPoll && editPollData && (
        <div className="modal-overlay" onClick={() => {
          setEditingPoll(null);
          setEditPollData(null);
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Chỉnh sửa Poll: {editingPoll.title}</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Tiêu đề</label>
                <input
                  type="text"
                  value={editPollData.title}
                  onChange={(e) => setEditPollData({ ...editPollData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={editPollData.description}
                  onChange={(e) => setEditPollData({ ...editPollData, description: e.target.value })}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Các lựa chọn</label>
                {editPollData.options.map((option, index) => (
                  <div key={index} className="option-input-group">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editPollData.options];
                        newOptions[index] = e.target.value;
                        setEditPollData({ ...editPollData, options: newOptions });
                      }}
                      required={index < 2}
                    />
                    {editPollData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = editPollData.options.filter((_, i) => i !== index);
                          setEditPollData({ ...editPollData, options: newOptions });
                        }}
                        className="remove-option-button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEditPollData({ ...editPollData, options: [...editPollData.options, ''] })}
                  className="add-option-button"
                >
                  + Thêm lựa chọn
                </button>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editPollData.isPrivate}
                    onChange={(e) => setEditPollData({ ...editPollData, isPrivate: e.target.checked })}
                  />
                  <span style={{ marginLeft: '8px' }}>Poll riêng tư</span>
                </label>
              </div>

              <div className="form-group">
                <label>Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  value={editPollData.startTime}
                  onChange={(e) => setEditPollData({ ...editPollData, startTime: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Thời gian kết thúc</label>
                <input
                  type="datetime-local"
                  value={editPollData.endTime}
                  onChange={(e) => setEditPollData({ ...editPollData, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPoll(null);
                    setEditPollData(null);
                  }}
                  className="cancel-button"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

