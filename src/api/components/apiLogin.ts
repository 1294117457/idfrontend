import apiClient from '@/utils/http'
import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_BASE_API

export interface LoginDto {
  username: string;
  password: string;
  verifyCode: string;
  captchaId: string;
}

export interface resType {
  code: number;
  msg: string;
  data: any;
}

// ✅ 统一使用驼峰命名
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResType {
  code: number;
  msg: string;
  data: TokenResponse;
}

// ✅ 刷新 token - 使用驼峰命名
export const refreshToken = async (refreshToken: string): Promise<TokenResponse> => {
  try {
    const response = await axios.post<{
      code: number;
      msg: string;
      data: TokenResponse;
    }>(
      `${apiBaseUrl}/api/authserver/refresh`,
      { refreshToken: refreshToken },  // ✅ 发送驼峰命名
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('刷新 token 响应:', response.data);
    
    if (response.data.code !== 200) {
      throw new Error(response.data.msg || '刷新失败');
    }
    
    // ✅ 直接返回驼峰命名
    return response.data.data;
  } catch (error) {
    console.error('刷新 token 失败:', error);
    throw new Error('刷新token失败');
  }
};

// ✅ 登录
export const loginPost = async (logdto: LoginDto): Promise<LoginResType> => {
  try {
    const response = await apiClient.post<LoginResType>('/api/authserver/login', logdto);
    return response.data;
  } catch (error) {
    throw new Error('登录请求失败,请稍后重试');
  }
};

// 注册
export interface RegisterItem {
  username: string;
  password: string;
  email: string;
  code: string;
}

export const regesterRequest = async (reItem: RegisterItem) => {
  try {
    const response = await apiClient.post<resType>('/api/authserver/register', reItem);
    return response.data;
  } catch (error) {
    throw new Error('注册请求失败,请稍后重试');
  }
}

// 发送邮箱验证码
export const sentEmailCode = async (email: string) => {
  try {
    const response = await apiClient.post<resType>('/api/authserver/sendEmailCode', { email });
    return response.data;
  } catch (error) {
    throw new Error('邮箱验证码请求失败,请稍后重试');
  }
}