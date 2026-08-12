import { apiClient } from './api';
import { SoldierActionRequest } from '../types';

export const soldierRequestsService = {
  async fetchRequests(): Promise<SoldierActionRequest[]> {
    return apiClient.get<SoldierActionRequest[]>('/api/soldier-requests');
  },

  async reviewRequest(
    id: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
    reviewedBy?: string
  ) {
    return apiClient.put<{ success: boolean }>(`/api/soldier-requests/${id}/review`, {
      status,
      rejectionReason,
      reviewedBy,
    });
  }
};
