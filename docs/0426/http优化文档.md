# HTTP 请求层统一优化文档

> 生成时间：2026-04-26  
> 适用项目：`idfrontend`（学生前端）、`idfrontend-admin`（教师后台）  
> 关联后端：`idbackend`

---

## 一、优化目标

**页面代码只负责"调接口 + 用数据"，不再处理 try/catch 和弹窗。**

所有错误弹窗、成功弹窗、token 校验统一在 `http.ts` 拦截器中完成。

### 优化前（现状，每个请求 15-20 行）

```typescript
const handlePreview = async (row: FileMetadataVO) => {
  try {
    previewUrl.value = ''
    previewLoading.value = true
    const response = await getPreviewUrl(row.id, 60)
    if (response.code === 200) {
      previewUrl.value = response.data
      previewDialogVisible.value = true
    } else {
      ElMessage.error(response.msg || '获取预览链接失败')
    }
  } catch (error) {
    ElMessage.error('预览失败')
    console.error('预览错误:', error)
  } finally {
    previewLoading.value = false
  }
}
```

### 优化后（每个请求 5-8 行）

```typescript
const handlePreview = async (row: FileMetadataVO) => {
  previewLoading.value = true
  try {
    const res = await getPreviewUrl(row.id, 60)
    // 走到这里一定是 code === 200，拦截器已处理所有异常
    previewUrl.value = res.data
    previewDialogVisible.value = true
  } finally {
    previewLoading.value = false
  }
}
```

- 无 `catch` 块
- 无 `ElMessage` 调用
- 无 `response.code === 200` 判断
- `try/finally` 只负责重置 loading 状态

---

## 二、后端 msg 字段现状分析

### 2.1 ResultVo 结构（`idbackend`）

```java
public class ResultVo<T> {
    private int code;    // 200=成功, 400=参数错误, 401=未登录, 403=过期, 500=服务器错误
    private String msg;  // 中文提示信息
    private T data;      // 业务数据
}
```

### 2.2 后端 success msg 统计

后端控制器中 `ResultVo.success("...", data)` 使用的所有成功消息：

| msg | 使用场景 |
|-----|---------|
| 查询成功 | 所有 GET 列表/详情接口 |
| 更新成功 | PUT 更新接口 |
| 删除成功 | DELETE 接口 |
| 创建成功 | POST 创建接口 |
| 登录成功 | 登录 |
| 注册成功 | 注册 |
| 绑定成功 | 绑定学生信息 |
| 确认成功 | 确认学生信息 |
| 操作成功 | 状态变更等通用操作 |
| 头像上传成功 | 头像上传 |
| 文件上传成功 | 文件上传 |
| 提交成功 | 表单提交 |
| 审核通过 / 审核驳回 | 审核操作 |
| 验证码已发送 | 邮件验证码 |
| 密码重置成功 | 找回密码 |
| 分配成功 | 角色分配 |
| 配置已更新，立即生效 | 系统配置 |
| ... | 共约 35 种 |

**结论**：后端 msg 全部是中文、用户友好的文案，**可以直接用作前端弹窗内容**。

### 2.3 后端 error msg 来源

| 来源 | msg 内容 | 是否友好 |
|------|---------|---------|
| BusinessException | 中文，如"用户不存在"、"权限不足" | 友好 |
| GlobalExceptionHandler 兜底 | "服务器内部错误" | 友好 |
| 参数校验失败 | "参数校验失败" 或字段级错误 | 基本友好 |
| Agent 相关接口 | "Agent 调用失败: ..." 可能含英文 | 可能不友好 |

---

## 三、http.ts 优化方案

### 3.1 核心改动：响应拦截器自动处理弹窗

```typescript
// ==================== 响应拦截器（success 分支）====================
apiClient.interceptors.response.use(
  (response) => {
    const res = response.data  // { code, msg, data }

    // 1. 401 → 清 token + 跳登录（不弹业务提示，clearTokensAndRedirect 内部弹）
    if (res.code === 401) {
      clearTokensAndRedirect()
      return Promise.reject(res)
    }

    // 2. code !== 200 → 业务失败 → 自动弹错误 → reject
    if (res.code !== 200) {
      // 检查是否标记了静默模式
      if (!response.config.headers?.['X-Silent']) {
        ElMessage.error(res.msg || '请求失败')
      }
      return Promise.reject(res)
    }

    // 3. code === 200 → 成功
    //    非 GET 请求 且 msg 不是泛泛的"成功" → 自动弹成功提示
    const method = response.config.method?.toLowerCase()
    if (method !== 'get' && res.msg && res.msg !== '成功') {
      ElMessage.success(res.msg)
    }

    // 直接返回 res（即 { code, msg, data }），页面拿到后直接用 res.data
    return res
  },

  // ==================== 响应拦截器（error 分支）====================
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 401 → 强制登出
    if (error.response?.status === 401 || (error.response?.data as any)?.code === 401) {
      clearTokensAndRedirect()
      return Promise.reject(error)
    }

    // 403 → token 过期 → refresh 流程（保持现有逻辑不变）
    const isTokenExpired =
      error.response?.status === 403 || (error.response?.data as any)?.code === 403
    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      // ... refresh token 逻辑保持不变 ...
    }

    // 其他网络错误 → 统一弹窗
    const silent = originalRequest?.headers?.['X-Silent']
    if (!silent) {
      const msg = (error.response?.data as any)?.msg || '网络异常，请稍后重试'
      ElMessage.error(msg)
    }

    return Promise.reject(error)
  }
)
```

### 3.2 关键设计决策

#### 成功弹窗规则

```
if (method !== 'get' && msg !== '成功') → ElMessage.success(msg)
```

| 请求类型 | 后端 msg | 弹窗行为 |
|---------|---------|---------|
| GET /api/user/student/list | "查询成功" | **不弹**（GET 请求跳过） |
| PUT /api/user/student/info | "更新成功" | **自动弹** "更新成功" |
| POST /api/user/student/bind | "绑定成功" | **自动弹** "绑定成功" |
| DELETE /api/file/123 | "删除成功" | **自动弹** "删除成功" |
| POST /api/file/upload | "文件上传成功" | **自动弹** "文件上传成功" |
| GET /api/user/profile | "成功" | **不弹**（GET 且 msg 是泛泛的"成功"） |

**为什么跳过 GET**：查询类操作成功是理所当然的，弹窗反而干扰用户。
**为什么跳过 msg === "成功"**：`ResultVo.success(data)` 默认 msg 为"成功"，是泛泛的，弹出来没有信息量。

#### 失败弹窗规则

```
code !== 200 → ElMessage.error(msg || '请求失败')
```

所有非 200 的业务响应，统一弹后端返回的 msg。页面不需要再处理。

#### 静默模式

某些请求不希望弹窗（轮询、静默检查、后台预加载），通过自定义 header 标记：

```typescript
// API 层标记静默请求
export const silentCheck = () => {
  return apiClient.get('/api/xxx', { headers: { 'X-Silent': 'true' } })
}
```

拦截器检测到 `X-Silent` 后跳过弹窗。这个 header 不会发到后端（可以在请求拦截器中删除），或者直接保留也无影响。

### 3.3 返回值类型变化

**优化前**：拦截器返回 `AxiosResponse`，API 层取 `.data`，页面再取 `.code`/`.data`

```
拦截器 return response       →  AxiosResponse
API 层 return response.data  →  { code, msg, data }
页面   if (res.code === 200) →  手动判断
```

**优化后**：拦截器直接返回业务对象 `{ code, msg, data }`，code 已被拦截器判断过

```
拦截器 return res            →  { code: 200, msg, data }  (非200已reject)
API 层 return response.data  →  { code: 200, msg, data }  (类型不变)
页面   const res = await api →  直接用 res.data（一定是成功的）
```

**API 层代码不需要改动**，因为 API 函数签名 `Promise<ApiResponse<T>>` 保持不变。拦截器返回的 `res` 就是 `ApiResponse` 结构。

但需要注意 TypeScript 类型——axios 拦截器返回非 AxiosResponse 时需要类型断言。建议在 axios 声明文件中扩展：

```typescript
// src/common/types/axios.d.ts
import 'axios'
declare module 'axios' {
  interface AxiosInstance {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  }
}
```

这样 API 层可以简化为：

```typescript
// 优化后的 API 层
export const getUserBasicInfo = () =>
  apiClient.get<ApiResponse<UserBasicInfo>>('/api/user/profile')
```

### 3.4 clearTokensAndRedirect 改为 SPA 内跳转

```typescript
const clearTokensAndRedirect = async () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  ElMessage.error('登录已过期，请重新登录')
  // 动态 import 避免循环依赖
  const { default: router } = await import('@/router')
  router.push('/login')
}
```

### 3.5 Login 页面统一使用 STORAGE_KEYS

```typescript
// 现状（字符串字面量）
localStorage.setItem('accessToken', response.data.accessToken)
localStorage.setItem('refreshToken', response.data.refreshToken)

// 优化后
import { STORAGE_KEYS } from '@common/constants/storage'
localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken)
localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken)
```

### 3.6 路由守卫修正

```typescript
// 现状（catch 永远不会执行，因为 fetchUserBasicInfo 不抛异常）
if (!userStore.userInfo) {
  try {
    await userStore.fetchUserBasicInfo()
  } catch {
    userStore.clearAll()
    return '/login'
  }
}

// 优化后（检查返回值）
if (!userStore.userInfo) {
  const success = await userStore.fetchUserBasicInfo()
  if (!success) {
    userStore.clearAll()
    return '/login'
  }
}
```

---

## 四、各层职责划分

```
┌─────────────────────────────────────────────────────────────┐
│  页面层（views/）                                            │
│  职责：调接口 + 用数据 + 管理 loading 状态                      │
│  不做：try/catch错误处理、ElMessage弹窗、code判断               │
│                                                             │
│  const res = await someApi(params)                          │
│  // 走到这里一定成功，直接用 res.data                          │
│  tableData.value = res.data.list                            │
│                                                             │
│  // 有 loading 需求时用 try/finally                           │
│  loading.value = true                                       │
│  try {                                                      │
│    const res = await someApi(params)                        │
│    tableData.value = res.data.list                          │
│  } finally {                                                │
│    loading.value = false                                    │
│  }                                                          │
├─────────────────────────────────────────────────────────────┤
│  API 层（api/）                                              │
│  职责：定义接口 URL + 参数类型 + 返回类型                       │
│  不做：try/catch、错误转换                                     │
│                                                             │
│  export const getStudentList = (params: QueryParams) =>     │
│    apiClient.get<ApiResponse<PageData>>('/api/...', {params})│
├─────────────────────────────────────────────────────────────┤
│  HTTP 层（common/utils/http.ts）                             │
│  职责：token 注入、code 判断、弹窗、refresh、401/403 处理       │
│                                                             │
│  请求拦截器：注入 Bearer token                                │
│  响应拦截器：                                                │
│    code !== 200 → ElMessage.error(msg) → reject             │
│    code === 200 + 非GET + msg有内容 → ElMessage.success(msg) │
│    403 → refresh token → 重试                               │
│    401 → 清 token → 跳登录                                  │
│    网络错误 → ElMessage.error('网络异常')                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、页面代码改造示例

### 5.1 查询列表（GET，无弹窗）

```typescript
// ✅ 优化后
const loadFiles = async () => {
  loading.value = true
  try {
    const res = await searchFiles(params)
    fileList.value = res.data.list || []
    totalItems.value = res.data.total || 0
  } finally {
    loading.value = false
  }
}
```

### 5.2 提交表单（POST/PUT，自动弹成功）

```typescript
// ✅ 优化后 —— 后端返回 "更新成功"，拦截器自动弹
const updateStudent = async () => {
  submitting.value = true
  try {
    await updateStudentInfo(editForm.value)
    // 拦截器已弹 "更新成功"
    editDialogVisible.value = false
    await loadStudentInfo()
  } finally {
    submitting.value = false
  }
}
```

### 5.3 删除操作（DELETE，自动弹成功）

```typescript
// ✅ 优化后
const handleDelete = async (id: number) => {
  await deleteFile(id)
  // 拦截器已弹 "删除成功"
  await loadFiles()
}
```

### 5.4 不需要 loading 的简单调用

```typescript
// ✅ 最简形式，连 try/finally 都不需要
const confirmStudentInfo = async () => {
  await confirmStudent()
  // 拦截器已弹 "确认成功"
}
```

### 5.5 静默请求（不弹窗）

```typescript
// API 层
export const checkOnlineStatus = () =>
  apiClient.get('/api/user/status', { headers: { 'X-Silent': 'true' } })

// 页面
const isOnline = async () => {
  try {
    const res = await checkOnlineStatus()
    return res.data
  } catch {
    return false  // 静默失败，不弹窗
  }
}
```

### 5.6 需要在成功后执行额外逻辑

```typescript
const handleAvatarUpload = async (options: UploadRequestOptions) => {
  uploadingAvatar.value = true
  try {
    const res = await uploadAvatar(options.file as File)
    // 拦截器已弹 "头像上传成功"
    userEditForm.value.avatar = res.data
    avatarPreviewUrl.value = res.data
    userStore.updateUserInfo({ avatar: res.data })
  } finally {
    uploadingAvatar.value = false
  }
}
```

---

## 六、改动文件清单

### 第一批：核心改动（两个项目同步改）

| 文件 | 改动 |
|------|------|
| `idfrontend/src/common/utils/http.ts` | 重写响应拦截器：自动弹窗 + 直接返回 res |
| `idfrontend-admin/src/common/utils/http.ts` | 同上（两个项目 http.ts 逻辑统一） |
| `idfrontend/src/router/index.ts` | 修正 fetchUserBasicInfo 返回值判断 |
| `idfrontend-admin/src/router/index.ts` | 同上 |
| `idfrontend/src/views/login/index.vue` | 引入 STORAGE_KEYS 替换字符串 |

### 第二批：页面层清理（移除 try/catch 中的弹窗和 code 判断）

| 项目 | 文件 | 预估改动量 |
|------|------|-----------|
| idfrontend | views/files/index.vue | 5 个函数 |
| idfrontend | views/profile/index.vue | 5 个函数 |
| idfrontend | views/score/index.vue | 9 个函数 |
| idfrontend | views/score/history.vue | 9 个函数 |
| idfrontend | views/demand/index.vue | 5 个函数 |
| idfrontend | views/demand/manage.vue | 5 个函数 |
| idfrontend | views/contact/index.vue | 8 个函数 |
| idfrontend | views/contact/college.vue | 6 个函数 |
| idfrontend | views/home/index.vue | 1 个函数 |
| idfrontend-admin | views/files/index.vue | ~5 个函数 |
| idfrontend-admin | views/profile/index.vue | ~5 个函数 |
| idfrontend-admin | views/score/index.vue | ~9 个函数 |
| idfrontend-admin | views/account-manage/*.vue | ~8 个函数 |
| idfrontend-admin | views/student/index.vue | ~5 个函数 |
| **合计** | | **约 90 个函数** |

### 第三批：API 层清理（可选）

移除 API 函数中多余的 try/catch（如 `apiLogin.ts` 中的包装）。

---

## 七、注意事项

### 7.1 验证弹窗（ElMessage.warning）保留在页面

表单验证提示（如"请输入手机号"、"请填写姓名"）不是 API 请求的结果，**仍然放在页面中**：

```typescript
if (!form.fullName) {
  ElMessage.warning('请填写姓名')
  return
}
await bindStudent(form)
```

### 7.2 ElMessageBox.confirm 保留在页面

删除确认弹窗等交互确认仍然在页面中：

```typescript
await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
await deleteFile(id)
// 拦截器自动弹 "删除成功"
```

### 7.3 文件下载等特殊请求

文件下载（blob 响应）不走标准 JSON 解析，需要单独处理。可以在请求时标记 `responseType: 'blob'`，拦截器中检测到 blob 直接返回，不做 code 判断。

### 7.4 两个前端项目应保持 http.ts 一致

`idfrontend` 和 `idfrontend-admin` 的 `src/common/utils/http.ts` 应该保持逻辑完全一致（目前已经基本一致，只是 refresh token 的导入方式略有不同）。建议统一改动后同步。
