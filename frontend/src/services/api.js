// File cấu hình API để kết nối với backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Lấy token từ localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Lưu token vào localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Xóa token
const removeToken = () => {
  localStorage.removeItem('token');
};

// Hàm fetch API với authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// API Auth
export const authAPI = {
  sendOTP: async (userData) => {
    return await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: userData,
    });
  },

  verifyOTP: async (email, otpCode) => {
    const data = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email, otpCode },
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  register: async (userData) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: userData,
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  login: async (email, password, role) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password, role },
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  getCurrentUser: async () => {
    return await apiRequest('/auth/me');
  },

  logout: () => {
    removeToken();
  },
};

// API Polls
export const pollsAPI = {
  getAll: async () => {
    return await apiRequest('/polls');
  },

  getById: async (pollId) => {
    return await apiRequest(`/polls/${pollId}`);
  },

  create: async (pollData) => {
    return await apiRequest('/polls', {
      method: 'POST',
      body: pollData,
    });
  },

  vote: async (pollId, optionIndex) => {
    return await apiRequest(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: { optionIndex },
    });
  },

  delete: async (pollId) => {
    return await apiRequest(`/polls/${pollId}`, {
      method: 'DELETE',
    });
  },

  joinPoll: async (pollId, accessCode) => {
    return await apiRequest(`/polls/${pollId}/join`, {
      method: 'POST',
      body: { accessCode },
    });
  },
};

// API Blockchain
export const blockchainAPI = {
  getStats: async () => {
    return await apiRequest('/blockchain/stats');
  },

  validate: async () => {
    return await apiRequest('/blockchain/validate');
  },

  getPollTransactions: async (pollId) => {
    return await apiRequest(`/blockchain/poll/${pollId}/transactions`);
  },

  createGenesis: async () => {
    return await apiRequest('/blockchain/genesis', {
      method: 'POST',
    });
  },
};

export { getToken, setToken, removeToken };

