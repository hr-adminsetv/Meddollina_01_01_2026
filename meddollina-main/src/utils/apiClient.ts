/**
 * API Client
 * Axios instance with token management and interceptors
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  timeout: 120000, // 120 seconds (AI responses can take 30-60 seconds)
});

// Disable cache at axios level
apiClient.defaults.headers.common['Cache-Control'] = 'no-cache, no-store, must-revalidate';
apiClient.defaults.headers.common['Pragma'] = 'no-cache';
apiClient.defaults.headers.common['Expires'] = '0';

console.log('[ApiClient] Using API base URL:', API_BASE_URL);

// Token storage helpers
const TOKEN_KEY = 'meddollina_token';
const REFRESH_TOKEN_KEY = 'meddollina_refresh_token';

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor - Add auth token and debug info
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging for AI chat requests
    if (config.url?.includes('/api/ai/chat')) {
      console.log('[ApiClient] AI Chat Request:', {
        url: config.url,
        fullURL: `${apiClient.defaults.baseURL}${config.url}`,
        method: config.method,
        hasData: !!config.data,
        dataKeys: config.data ? Object.keys(config.data) : [],
        hasOcrContent: !!(config.data as any)?.ocr_content,
        ocrLength: (config.data as any)?.ocr_content?.length || 0,
        baseURL: apiClient.defaults.baseURL,
        headers: config.headers,
        timestamp: new Date().toISOString(),
        axiosInstance: apiClient.defaults,
        hasAuth: !!token,
        authHeader: config.headers?.Authorization ? 'Present' : 'Missing'
      });
      
      // Add cache-busting headers
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
      config.headers['X-Request-Time'] = Date.now().toString();
      
      // Add random header to prevent caching
      config.headers['X-Request-ID'] = Math.random().toString(36).substring(7);
      
      // CRITICAL: Log the actual request that will be sent
      console.log('[ApiClient] CRITICAL - About to send request to:', {
        baseURL: apiClient.defaults.baseURL,
        url: config.url,
        full: apiClient.defaults.baseURL + config.url
      });
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log AI responses
    if (response.config.url?.includes('/api/ai/chat')) {
      console.log('[ApiClient] AI Chat Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        fullURL: `${apiClient.defaults.baseURL}${response.config.url}`,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        responseData: response.data,
        responseHeaders: response.headers,
        requestURL: response.request.responseURL || 'N/A',
        // CRITICAL: Check if response came from Flask AI directly
        isFlaskDirect: response.request.responseURL?.includes(':5001') || false,
        isBackend: response.request.responseURL?.includes(':5002') || false,
        isVite: response.request.responseURL?.includes(':8081') || false
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        
        if (refreshToken) {
          // Try to refresh the token
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data.data;
          tokenStorage.setToken(token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
