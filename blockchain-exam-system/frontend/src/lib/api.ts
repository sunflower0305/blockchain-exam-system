import axios from 'axios';
import { useAuthStore } from '@/store/auth';

// 浏览器端使用 localhost，服务端也使用 localhost（因为用户浏览器需要访问）
const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
  : 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理token过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          useAuthStore.getState().login(
            useAuthStore.getState().user!,
            access,
            refreshToken
          );

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ===================== 认证 API =====================

export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post('/users/token/', { username, password });
    return response.data;
  },

  register: async (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    role: string;
    employee_id?: string;
    department?: string;
  }) => {
    const response = await api.post('/users/', data);
    return response.data;
  },

  getProfile: async (token?: string) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await api.get('/users/me/', config);
    return response.data;
  },

  generateKeyPair: async (password: string) => {
    const response = await api.post('/users/generate_keypair/', { password });
    return response.data;
  },
};

// ===================== 考试 API =====================

export const examApi = {
  getExams: async (params?: { status?: string; page?: number }) => {
    const response = await api.get('/exams/exams/', { params });
    return response.data;
  },

  getExam: async (id: string) => {
    const response = await api.get(`/exams/exams/${id}/`);
    return response.data;
  },

  createExam: async (data: {
    name: string;
    subject: number;
    batch: string;
    exam_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    assigned_teacher?: number;
    notes?: string;
  }) => {
    const response = await api.post('/exams/exams/', data);
    return response.data;
  },

  assignTeacher: async (examId: string, teacherId: string) => {
    const response = await api.post(`/exams/exams/${examId}/assign_teacher/`, {
      teacher_id: teacherId,
    });
    return response.data;
  },

  approvePaper: async (examId: string, paperId: string) => {
    const response = await api.post(`/exams/exams/${examId}/approve/`, {
      paper_id: paperId,
    });
    return response.data;
  },

  setReady: async (examId: string) => {
    const response = await api.post(`/exams/exams/${examId}/set_ready/`);
    return response.data;
  },
};

// ===================== 试卷 API =====================

export const paperApi = {
  uploadPaper: async (examId: string, file: File, password: string) => {
    const formData = new FormData();
    formData.append('exam_id', examId);
    formData.append('file', file);
    formData.append('password', password);

    const response = await api.post('/exams/papers/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPapers: async (examId?: string) => {
    const params = examId ? { exam_id: examId } : {};
    const response = await api.get('/exams/papers/', { params });
    return response.data;
  },

  decryptPaper: async (paperId: string, password: string) => {
    const response = await api.post(`/exams/papers/${paperId}/decrypt/`, {
      password,
    });
    return response.data;
  },

  getAuditLogs: async (paperId: string) => {
    const response = await api.get(`/exams/papers/${paperId}/audit_logs/`);
    return response.data;
  },
};

// ===================== 区块链 API =====================

export const blockchainApi = {
  getStatus: async () => {
    const response = await api.get('/blockchain/status/');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/blockchain/stats/');
    return response.data;
  },

  getRecords: async (params?: { page?: number; page_size?: number; search?: string }) => {
    const response = await api.get('/blockchain/records/', { params });
    return response.data;
  },

  getPapers: async (params?: { page_size?: number; bookmark?: string }) => {
    const response = await api.get('/blockchain/papers/', { params });
    return response.data;
  },

  getPaperBlockchainInfo: async (paperId: string) => {
    const response = await api.get(`/blockchain/paper/${paperId}/`);
    return response.data;
  },

  getPaperHistory: async (paperId: string) => {
    const response = await api.get(`/blockchain/paper/${paperId}/history/`);
    return response.data;
  },

  getPaperAccessLogs: async (paperId: string) => {
    const response = await api.get(`/blockchain/paper/${paperId}/access-logs/`);
    return response.data;
  },

  verifyPaper: async (paperId: string, fileHash: string) => {
    const response = await api.post('/blockchain/verify/', {
      paper_id: paperId,
      file_hash: fileHash,
    });
    return response.data;
  },
};

// ===================== 科目 API =====================

export const subjectApi = {
  getSubjects: async () => {
    const response = await api.get('/exams/subjects/');
    return response.data;
  },

  getSubject: async (id: number) => {
    const response = await api.get(`/exams/subjects/${id}/`);
    return response.data;
  },

  createSubject: async (data: {
    name: string;
    code: string;
    department: string;
    description?: string;
  }) => {
    const response = await api.post('/exams/subjects/', data);
    return response.data;
  },

  updateSubject: async (id: number, data: {
    name: string;
    code: string;
    department: string;
    description?: string;
  }) => {
    const response = await api.put(`/exams/subjects/${id}/`, data);
    return response.data;
  },

  deleteSubject: async (id: number) => {
    const response = await api.delete(`/exams/subjects/${id}/`);
    return response.data;
  },
};

// ===================== 用户 API =====================

export const userApi = {
  getUsers: async (params?: { role?: string; page?: number }) => {
    const response = await api.get('/users/', { params });
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await api.get(`/users/${id}/`);
    return response.data;
  },
};

// ===================== 审计日志 API =====================

export const auditApi = {
  getLogs: async (params?: { action?: string; date?: string; page?: number }) => {
    const response = await api.get('/exams/audit-logs/', { params });
    return response.data;
  },
};
