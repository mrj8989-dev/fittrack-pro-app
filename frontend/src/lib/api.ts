import axios from 'axios'

export const API_BASE_URL = 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ft-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ft-token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api