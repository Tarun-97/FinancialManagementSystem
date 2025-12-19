import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message = data?.message || error?.message || 'Request failed';
    // Attach normalized error info
    return Promise.reject({
      status,
      message,
      details: data?.details || null
    });
  }
);

export async function get(path, params = {}) {
  const res = await api.get(path, { params });
  return res.data;
}
export async function post(path, body) {
  const res = await api.post(path, body);
  return res.data;
}
export async function put(path, body) {
  const res = await api.put(path, body);
  return res.data;
}
export async function del(path) {
  const res = await api.delete(path);
  return res.data;
}



export default api;
