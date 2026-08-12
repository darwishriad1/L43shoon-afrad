import { apiClient } from './api';
import { Notification } from '../types';

export const notificationsService = {
  async createNotification(notification: Notification): Promise<Notification> {
    return apiClient.post<Notification>('/api/notifications', notification);
  },

  async markAsRead(id: string): Promise<Notification> {
    return apiClient.put<Notification>(`/api/notifications/${id}`, { isRead: true });
  }
};
