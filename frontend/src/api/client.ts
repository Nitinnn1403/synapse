import axios from 'axios'
import baseURL from './baseURL'

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default client
