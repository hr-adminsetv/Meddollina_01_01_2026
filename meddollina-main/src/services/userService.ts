import apiClient from '@/utils/apiClient';

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  profession?: string;
  department?: string;
  specialization?: string;
  medicalLicenseId?: string;
  licenseExpiryDate?: string;
  hospital?: {
    name?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  yearsOfExperience?: number;
  bio?: string;
  role?: string;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

class UserService {
  // Get current user profile
  async getCurrentProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get('/api/users/profile');
      return response.data.data;
    } catch (error) {
      console.error('[UserService] Error fetching profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await apiClient.put('/api/users/profile', updates);
      return response.data.data;
    } catch (error) {
      console.error('[UserService] Error updating profile:', error);
      throw error;
    }
  }

  // Get user by email (public endpoint)
  async getUserByEmail(email: string): Promise<UserProfile> {
    try {
      const response = await apiClient.get(`/api/users?email=${email}`);
      return response.data.data;
    } catch (error) {
      console.error('[UserService] Error fetching user by email:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
