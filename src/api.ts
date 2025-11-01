// src/api.ts (새 파일)
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL, // .env 파일의 API URL
  headers: {
    "Content-Type": "application/json",
  },
});

// --- JWT 변경 ---
// Axios 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 1. localStorage에서 accessToken 가져오기
    const token = localStorage.getItem("accessToken");

    // 2. 토큰이 있다면 헤더에 추가
    if (token) {
      if (!config.headers) {
        config.headers = {}; 
      };
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// (선택사항) 토큰 갱신 로직 (응답 인터셉터)
// ... 401 에러 발생 시 refreshToken으로 새 토큰 받는 로직 ...

export default api;