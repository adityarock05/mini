import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry if the request was for login or refresh
    const isAuthRequest = originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    console.log("API Login - Sending:", { email, password: "***" });
    const payload = { email, password };
    console.log("API Login - Payload type:", typeof payload, "Keys:", Object.keys(payload));
    const response = await apiClient.post("/auth/login", payload);
    console.log("API Login - Response:", response.data);
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    role?: string;
    full_name?: string;
    department?: string;
  }) => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    await apiClient.post("/auth/logout", { refresh_token: refreshToken });
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

// Users API
export const usersApi = {
  getMe: async () => {
    const response = await apiClient.get("/users/me");
    return response.data;
  },

  updateMe: async (data: {
    display_name?: string;
    department?: string;
    avatar_url?: string;
  }) => {
    const response = await apiClient.put("/users/me", data);
    return response.data;
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }) => {
    const response = await apiClient.post("/users/me/change-password", data);
    return response.data;
  },
};

// Grievances API
export const grievancesApi = {
  list: async (params?: { status?: string; category?: string }) => {
    const response = await apiClient.get("/grievances", { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/grievances/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    location: string;
    is_anonymous: boolean;
  }) => {
    const response = await apiClient.post("/grievances", data);
    return response.data;
  },

  addUpdate: async (id: string, data: { status: string; remark: string }) => {
    const response = await apiClient.post(`/grievances/${id}/updates`, data);
    return response.data;
  },

  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(`/grievances/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

// Courses API
export const coursesApi = {
  list: async (params?: { department?: string; semester?: string }) => {
    const response = await apiClient.get("/courses", { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data;
  },

  create: async (data: {
    code: string;
    name: string;
    credits: number;
    semester: string;
    department: string;
    description?: string;
  }) => {
    const response = await apiClient.post("/courses", data);
    return response.data;
  },

  enroll: async (id: string) => {
    const response = await apiClient.post(`/courses/${id}/enroll`);
    return response.data;
  },

  getResources: async (id: string, params?: { type?: string }) => {
    const response = await apiClient.get(`/courses/${id}/resources`, { params });
    return response.data;
  },

  createResource: async (id: string, data: {
    title: string;
    type: string;
    year?: number;
    exam_type?: string;
    tags?: string[];
  }) => {
    const response = await apiClient.post(`/courses/${id}/resources`, data);
    return response.data;
  },

  getCalendar: async (id: string) => {
    const response = await apiClient.get(`/courses/${id}/calendar`);
    return response.data;
  },

  getMyEnrollments: async () => {
    const response = await apiClient.get("/courses/my/enrollments");
    return response.data;
  },
};

// Opportunities API
export const opportunitiesApi = {
  list: async (params?: { skills?: string; is_open?: boolean }) => {
    const response = await apiClient.get("/opportunities", { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/opportunities/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description: string;
    skills: string[];
    duration: string;
    stipend?: string;
    deadline: string;
  }) => {
    const response = await apiClient.post("/opportunities", data);
    return response.data;
  },



  delete: async (id: string) => {
    const response = await apiClient.delete(`/opportunities/${id}`);
    return response.data;
  },

  close: async (id: string) => {
    const response = await apiClient.put(`/opportunities/${id}/close`);
    return response.data;
  },

  apply: async (id: string, data: { cover_letter: string }) => {
    const response = await apiClient.post(`/opportunities/${id}/apply`, data);
    return response.data;
  },

  getApplications: async (id: string) => {
    const response = await apiClient.get(`/opportunities/${id}/applications`);
    return response.data;
  },

  updateApplicationStatus: async (applicationId: string, data: { status: string }) => {
    const response = await apiClient.put(`/opportunities/applications/${applicationId}/status`, data);
    return response.data;
  },

  getMyApplications: async () => {
    const response = await apiClient.get("/opportunities/my/applications");
    return response.data;
  },

  // Tasks (Scholar's Ledger)
  getMyTasks: async (params?: { status?: string }) => {
    const response = await apiClient.get("/opportunities/my/tasks", { params });
    return response.data;
  },

  createTask: async (data: {
    title: string;
    description: string;
    category: string;
    deadline?: string;
  }) => {
    const response = await apiClient.post("/opportunities/my/tasks", data);
    return response.data;
  },

  updateTask: async (id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    progress?: number;
  }) => {
    const response = await apiClient.put(`/opportunities/my/tasks/${id}`, data);
    return response.data;
  },

  deleteTask: async (id: string) => {
    const response = await apiClient.delete(`/opportunities/my/tasks/${id}`);
    return response.data;
  },
};