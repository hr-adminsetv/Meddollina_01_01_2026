/**
 * Authentication Service
 * Handles user authentication with backend API
 */

import apiClient, { tokenStorage } from '@/utils/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      profession: string;
      role: string;
    };
    token: string;
    refreshToken: string;
    expiresAt: string;
  };
}

export interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
}

class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    if (response.data.success) {
      const { token, refreshToken } = response.data.data;
      tokenStorage.setToken(token);
      tokenStorage.setRefreshToken(refreshToken);
    }

    return response.data;
  }

  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenStorage.clearTokens();
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_ALL);
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      tokenStorage.clearTokens();
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.VALIDATE);
      return response.data.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get active sessions
   */
  async getSessions(): Promise<Session[]> {
    const response = await apiClient.get<{ success: boolean; data: Session[] }>(
      API_ENDPOINTS.AUTH.SESSIONS
    );
    return response.data.data;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!tokenStorage.getToken();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return tokenStorage.getToken();
  }

  /**
   * Send password reset OTP to email
   */
  async sendPasswordResetOTP(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/auth/forgot-password/send-otp', { email });
    return response.data;
  }

  /**
   * Verify password reset OTP
   */
  async verifyPasswordResetOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/auth/forgot-password/verify-otp', { 
      email, 
      otp 
    });
    return response.data;
  }

  /**
   * Reset password with verified OTP
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/auth/forgot-password/reset', { 
      email, 
      otp, 
      newPassword 
    });
    return response.data;
  }
}

export default new AuthService();
