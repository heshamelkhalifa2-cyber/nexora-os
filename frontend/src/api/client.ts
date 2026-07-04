import axios from 'axios';

// في التطوير: يعتمد على Vite proxy ('/api' → localhost:3000، مُعرَّف في vite.config.ts).
// في الإنتاج (لو الفرونت اند والباك اند على دومينين منفصلين): عرّف VITE_API_URL في .env قبل الـ build.
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexora_token');
  if (token) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nexora_token');
      localStorage.removeItem('nexora_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
