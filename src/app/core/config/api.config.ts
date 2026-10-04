export const API_CONFIG = {
  baseUrl: 'http://localhost:3000/api',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    me: '/auth/me',
  },
  metrics: '/metrics',
  records: '/records',
  dashboard: '/dashboard',
  insights: '/insights',
} as const;
