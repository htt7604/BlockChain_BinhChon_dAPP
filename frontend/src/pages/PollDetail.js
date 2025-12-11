import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pollsAPI } from '../services/api';
import { connectSocket, getSocket, joinPollRoom, leavePollRoom } from '../services/socket';
import './PollDetail.css';

const PollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    setCurrentUser(user);

    const loadPoll = async () => {
      try {
        const response = await pollsAPI.getById(id);
        if (response.success) {
          setPoll(response.poll);
          
          // Kết nối socket và join room
          connectSocket();
          const socket = getSocket();
          if (socket) {
            joinPollRoom(id);
            console.log('✅ Đã join poll room:', id);
          }
        } else {
          alert('Không tìm thấy poll!');
          navigate('/dashboard');
        }
      } catch (error) {
        if (error.message.includes('mã tham gia')) {
          // Nếu là private poll và chưa tham gia, chuyển về dashboard
          alert('Bạn chưa tham gia poll này. Vui lòng nhập mã tham gia từ trang chủ.');
          navigate('/dashboard');
        } else {
          alert('Có lỗi xảy ra: ' + error.message);
          navigate('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    loadPoll();

    return () => {
      const socket = getSocket();
      if (socket) {
        leavePollRoom(id);
      }
    };
  }, [id, navigate]);

  // Lắng nghe real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !poll) return;

    const handlePollUpdated = (data) => {
      const pollIdStr = (poll._id || poll.id || '').toString();
      const dataPollIdStr = (data.pollId || '').toString();
      
      console.log('📡 Poll detail real-time update:', data);
      
      if (pollIdStr === dataPollIdStr) {
        setPoll(prevPoll => ({
          ...prevPoll,
          totalVotes: data.totalVotes,
          optionVotes: data.optionVotes,
          optionPercentages: data.optionPercentages,
          votes: data.votes || prevPoll.votes || [],
          // Cập nhật userVoted nếu vote mới là của user hiện tại
          userVoted: prevPoll.userVoted || (data.vote && data.vote.userId === currentUser?.id)
        }));
      }
    };

    socket.on('poll-updated', handlePollUpdated);

    socket.on('poll-updated', handlePollUpdated);

    return () => {
      socket.off('poll-updated', handlePollUpdated);
    };
  }, [poll, currentUser]);

  const handleSelectOption = (index) => {
    if (poll.userVoted || !canVote()) return;
    setSelectedOption(index);
    setShowConfirm(true);
  };

  const handleConfirmVote = async () => {
    if (selectedOption === null) return;

    try {
      const response = await pollsAPI.vote(id, selectedOption);
      if (response.success) {
        setPoll(prev => ({
          ...prev,
          userVoted: true,
          userVoteOption: selectedOption,
          totalVotes: response.poll.totalVotes,
          optionVotes: response.poll.optionVotes,
          optionPercentages: response.poll.optionPercentages
        }));
        setShowConfirm(false);
        alert('Bình chọn thành công! Vote của bạn đã được lưu vào blockchain.');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi bình chọn!');
    }
  };

  const canVote = () => {
    if (!poll) return false;
    const now = new Date();
    const start = new Date(poll.startTime);
    const end = new Date(poll.endTime);
    return now >= start && now <= end && !poll.userVoted && poll.canVote;
  };

  const getPollStatus = () => {
    if (!poll) return { text: '', class: '' };
    const now = new Date();
    const start = new Date(poll.startTime);
    const end = new Date(poll.endTime);

    if (now < start) return { text: 'Sắp bắt đầu', class: 'status-upcoming' };
    if (now >= start && now <= end) return { text: 'Đang diễn ra', class: 'status-active' };
    return { text: 'Đã kết thúc', class: 'status-ended' };
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

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!poll) {
    return null;
  }

  const status = getPollStatus();

  return (
    <div className="poll-detail-container">
      <div className="poll-detail-card">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          ← Quay lại
        </button>

        <div className="poll-detail-header">
          <h1>{poll.title}</h1>
          <div className="poll-badges">
            {poll.isPrivate ? (
              <span className="badge badge-private">🔒 Riêng tư</span>
            ) : (
              <span className="badge badge-public">🌐 Công khai</span>
            )}
            <span className={`badge ${status.class}`}>{status.text}</span>
          </div>
        </div>

        <div className="poll-info">
          <p className="poll-description">{poll.description}</p>
          <div className="poll-time-info">
            <div className="time-item">
              <strong>Bắt đầu:</strong> {formatDateTime(poll.startTime)}
            </div>
            <div className="time-item">
              <strong>Kết thúc:</strong> {formatDateTime(poll.endTime)}
            </div>
            <div className="time-item">
              <strong>Tạo bởi:</strong> {poll.createdByName}
            </div>
          </div>
        </div>

        <div className="poll-options-section">
          <h2>Lựa chọn</h2>
          <div className="poll-options">
            {poll.options.map((option, index) => {
              const voted = poll.userVoted;
              const percentage = poll.optionPercentages?.[index] || 0;
              const isSelected = selectedOption === index;
              const isVotedOption = poll.userVoteOption === index;

              return (
                <div
                  key={index}
                  className={`poll-option ${isSelected ? 'selected' : ''} ${isVotedOption ? 'user-voted' : ''} ${!canVote() ? 'disabled' : ''}`}
                  onClick={() => handleSelectOption(index)}
                >
                  <div className="option-content">
                    <span className="option-text">{option}</span>
                    {(voted || poll.status === 'ended') && (
                      <span className="option-percentage">{percentage}%</span>
                    )}
                  </div>
                  {(voted || poll.status === 'ended') && (
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

          {showConfirm && (
            <div className="confirm-vote-section">
              <p>Bạn đã chọn: <strong>{poll.options[selectedOption]}</strong></p>
              <div className="confirm-buttons">
                <button onClick={handleConfirmVote} className="confirm-button">
                  ✓ Xác nhận bình chọn
                </button>
                <button onClick={() => {
                  setShowConfirm(false);
                  setSelectedOption(null);
                }} className="cancel-button">
                  Hủy
                </button>
              </div>
            </div>
          )}

          {!canVote() && !poll.userVoted && (
            <div className="cannot-vote-message">
              {poll.status === 'upcoming' && 'Poll chưa bắt đầu'}
              {poll.status === 'ended' && 'Poll đã kết thúc'}
              {poll.status === 'active' && !poll.canVote && 'Bạn chưa tham gia poll này'}
            </div>
          )}
        </div>

        <div className="poll-stats">
          <div className="stat-item">
            <strong>Tổng số phiếu:</strong> {poll.totalVotes || poll.votes?.length || 0}
          </div>
          {poll.userVoted && (
            <div className="stat-item voted-badge">
              ✓ Bạn đã bình chọn
            </div>
          )}
        </div>

        {poll.votes && poll.votes.length > 0 && (
          <div className="vote-history-section">
            <h3>📋 Lịch sử bình chọn (Blockchain - Công khai)</h3>
            <p className="history-note">Danh sách tất cả người đã bình chọn với thông tin đầy đủ:</p>
            <div className="vote-list">
              {poll.votes.map((vote, idx) => (
                <div key={vote._id || idx} className="vote-item">
                  <div className="vote-user">
                    <strong>👤 {vote.userName || 'Unknown'}</strong>
                    <span className="vote-email">({vote.userEmail || 'N/A'})</span>
                  </div>
                  <div className="vote-details">
                    <span className="vote-option">✅ Đã chọn: <strong>{vote.optionText || poll.options[vote.optionIndex]}</strong></span>
                    <span className="vote-time">🕐 {formatDateTime(vote.votedAt)}</span>
                  </div>
                  <div className="vote-blockchain">
                    <div className="tx-hash">
                      🔗 Transaction Hash: <code>{vote.transactionHash}</code>
                    </div>
                    <div className="block-hash">
                      📦 Block Hash: <code>{vote.blockHash?.substring(0, 30)}...</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PollDetail;

