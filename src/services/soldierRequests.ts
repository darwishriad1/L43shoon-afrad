import { apiClient } from './api';
import { SoldierActionRequest } from '../types';
import { syncToSecondaryDB } from './supabaseSecondary';

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
    const result = await apiClient.put<{ success: boolean; request?: SoldierActionRequest }>(`/api/soldier-requests/${id}/review`, {
      status,
      rejectionReason,
      reviewedBy,
    });
    syncToSecondaryDB('soldier_requests', 'update', { id, status, rejectionReason, reviewedBy });
    return result;
  }
};
