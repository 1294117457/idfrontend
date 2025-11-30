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

// 获取验证码图片
// ✅ 验证码相关接口
export interface CaptchaResponse {
  captchaId: string;
  base64: string;
}

// ✅ 获取验证码
export const getCaptcha = async (): Promise<CaptchaResponse> => {
  try {
    const response = await axios.get<CaptchaResponse>(
      `${apiBaseUrl}/api/authserver/captcha/generate`
    );
    return response.data;
  } catch (error) {
    console.error('获取验证码失败:', error);
    throw new Error('获取验证码失败');
  }
};

// ========== 微信登录相关接口 ==========

/** 微信登录二维码响应 */
export interface WechatQrCodeResponse {
  qrCode: string    // base64格式的二维码图片
  state: string     // 状态码，用于轮询
}

/** 微信登录状态响应 */
export interface WechatLoginStatusResponse {
  accessToken?: string
  refreshToken?: string
  openId?: string
  nickname?: string
  headImgUrl?: string
  status?: 'pending_bind' | 'success' // 登录状态
  userId?: number
}

/** 微信绑定请求 */
export interface WechatBindRequest {
  state: string
  username: string
  password: string
}

/** 获取微信登录二维码 */
export const getWechatLoginQrCode = async (): Promise<WechatQrCodeResponse> => {
  try {
    const response = await axios.get<{
      code: number
      msg: string
      data: string
    }>(`${apiBaseUrl}/api/wechat/open/qrcode`)
    
    if (response.data.code === 200) {
      return JSON.parse(response.data.data)
    } else {
      throw new Error(response.data.msg || '获取二维码失败')
    }
  } catch (error) {
    console.error('获取微信二维码失败:', error)
    throw new Error('获取微信二维码失败')
  }
}

/** 轮询检查微信登录状态 */
export const checkWechatLoginStatus = async (state: string): Promise<WechatLoginStatusResponse | null> => {
  try {
    const response = await axios.get<{
      code: number
      msg: string
      data: string
    }>(`${apiBaseUrl}/api/wechat/open/check-login`, {
      params: { state }
    })
    
    if (response.data.code === 200) {
      return JSON.parse(response.data.data)
    } else if (response.data.code === 202) {
      return null // 等待扫码
    } else {
      throw new Error(response.data.msg || '检查登录状态失败')
    }
  } catch (error) {
    console.error('检查微信登录状态失败:', error)
    throw new Error('检查微信登录状态失败')
  }
}

/** 绑定微信到现有账号 */
export const bindWechatToAccount = async (bindData: WechatBindRequest): Promise<resType> => {
  try {
    const response = await axios.post<resType>(`${apiBaseUrl}/api/wechat/open/bind-account`, bindData)
    return response.data
  } catch (error) {
    throw new Error('绑定账号失败,请稍后重试')
  }
}
