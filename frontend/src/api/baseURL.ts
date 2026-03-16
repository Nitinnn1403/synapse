// In development: proxy via vite (/api → localhost:8000)
// In production: set VITE_API_BASE_URL to your Render backend URL (e.g. https://synapse-backend.onrender.com)
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api'

export default baseURL
