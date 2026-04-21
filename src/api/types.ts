export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
