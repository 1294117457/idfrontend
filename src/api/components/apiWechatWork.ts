import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_BASE_API

/** 企业微信登录二维码响应 */
export interface WechatWorkQrCodeResponse {
  qrCode: string    // base64格式的二维码图片
  state: string     // 状态码，用于轮询
}

/** 企业微信登录状态响应 */
export interface WechatWorkLoginStatusResponse {
  status: 'pending' | 'pending_bind' | 'success' | 'expired'
  accessToken?: string
  refreshToken?: string
  userId?: number
  name?: string
  mobile?: string
  avatar?: string
}

/** 企业微信绑定请求 */
export interface WechatWorkBindRequest {
  state: string
  username: string
  password: string
}

/** 获取企业微信登录二维码 */
export const getWechatWorkQrCode = async (): Promise<WechatWorkQrCodeResponse> => {
  try {
    const response = await axios.get<{
      code: number
      msg: string
      data: Map<string, string>
    }>(`${apiBaseUrl}/api/wechat/work/qrcode`)
    
    if (response.data.code === 200) {
      return response.data.data as unknown as WechatWorkQrCodeResponse
    } else {
      throw new Error(response.data.msg || '获取企业微信二维码失败')
    }
  } catch (error) {
    console.error('获取企业微信二维码失败:', error)
    throw new Error('获取企业微信二维码失败')
  }
}

/** 轮询检查企业微信登录状态 */
export const checkWechatWorkLoginStatus = async (
  state: string
): Promise<WechatWorkLoginStatusResponse | null> => {
  try {
    const response = await axios.get<{
      code: number
      msg: string
      data: WechatWorkLoginStatusResponse
    }>(`${apiBaseUrl}/api/wechat/work/check-login`, {
      params: { state }
    })
    
    if (response.data.code === 200) {
      return response.data.data
    } else {
      return null
    }
  } catch (error) {
    console.error('检查企业微信登录状态失败:', error)
    return null
  }
}

/** 绑定企业微信到现有账号 */
export const bindWechatWorkToAccount = async (
  bindData: WechatWorkBindRequest
): Promise<{ code: number; msg: string; data: any }> => {
  try {
    const response = await axios.post<{
      code: number
      msg: string
      data: any
    }>(`${apiBaseUrl}/api/wechat/work/bind-account`, null, {
      params: bindData
    })
    
    return response.data
  } catch (error) {
    throw new Error('绑定企业微信账号失败，请稍后重试')
  }
}