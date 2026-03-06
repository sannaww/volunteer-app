import axios from "axios";
import { getSessionToken } from "../utils/authSession";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getSessionToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
