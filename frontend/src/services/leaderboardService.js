import { apiCall } from './api'
export const leaderboardService = {
  getDailyLeaderboard: (limit = 10, offset = 0) => apiCall('/api/leaderboard/daily?limit=' + limit + '&offset=' + offset),
  getMonthlyLeaderboard: (limit = 10, offset = 0) => apiCall('/api/leaderboard/monthly?limit=' + limit + '&offset=' + offset),
}
