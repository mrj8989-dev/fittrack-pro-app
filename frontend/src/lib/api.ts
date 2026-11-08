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
    // Token caducado o cuenta desactivada: fuera. En el propio login, el 401 es "credenciales
    // incorrectas" y lo muestra el formulario, así que no se recarga la página.
    const isLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem('ft-token')
      localStorage.removeItem('ft-user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api