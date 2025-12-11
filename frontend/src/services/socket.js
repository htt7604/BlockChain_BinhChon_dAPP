import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Đã kết nối Socket.io');
    });

    socket.on('disconnect', () => {
      console.log('❌ Đã ngắt kết nối Socket.io');
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinPollRoom = (pollId) => {
  if (socket) {
    socket.emit('join-poll', pollId);
  }
};

export const leavePollRoom = (pollId) => {
  if (socket) {
    socket.emit('leave-poll', pollId);
  }
};

export const getSocket = () => {
  return socket;
};

