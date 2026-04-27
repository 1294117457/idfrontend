# Token & HTTP 请求优化文档

> 生成时间：2026-04-26  
> 项目：`idfrontend`（学生前端）  
> 关联后端：`idbackend`

---

## 一、现状分析

### 1.1 Token 生命周期（后端）

| Token 类型 | 有效期 | 用途 |
|-----------|--------|------|
| accessToken | 30 分钟 | 每次 API 请求携带 |
| refreshToken | 7 天 | accessToken 过期后换取新 token |

**JWT Secret 配置**（`application.yml`）：
```yaml
jwt:
  secret: ${JWT_SECRET:aVeryLongBase64EncodedSecretKeyForDevelopmentOnlyPleaseChangeInProduction1234567890}
```

- Secret 是**固定配置值**（非每次启动随机生成）
- 后端重启后，**已签发的 token 仍然有效**（因为签名密钥不变）
- 这就是为什么重启后端后，前端没有被踢到登录页的原因——**这是正确的行为**

### 1.2 后端返回的状态码（AuthInterceptor）

| 场景 | HTTP Status | body.code | 说明 |
|------|-------------|-----------|------|
| 没有 Authorization header | **401** | 401 | `未登录，请重新登录` |
| token 类型错误（不是 access） | **401** | 401 | `Token 类型错误，请重新登录` |
| token 无效/被篡改 | **401** | 401 | `Token 无效，请重新登录` |
| **accessToken 过期** | **403** | 403 | `Access Token 已过期，请刷新Token` |
| 角色权限不足 | **403** | 403 | `权限不足：需要角色 [...]` |

**关键点**：后端的 token 过期返回的是 **HTTP 403**，不是 200+业务码。这意味着前端的刷新逻辑实际上在正确的分支运行。

### 1.3 Token 存储位置

| 位置 | 当前用途 |
|------|---------|
| **localStorage** | 存储 accessToken 和 refreshToken（键名为字符串 `'accessToken'`、`'refreshToken'`） |
| **Pinia (userStore)** | 只存用户信息（userInfo、studentInfo），不存 token |

### 1.4 当前请求流程

```
[页面发起请求]
    │
    ▼
[Axios 请求拦截器] ── localStorage 取 accessToken → 加到 Authorization header
    │
    ▼
[后端处理] ── AuthInterceptor 校验 JWT
    │
    ├─ 成功 → 返回业务数据
    ├─ 401（未登录/无效）→ 前端 clearTokensAndRedirect()
    └─ 403（过期）→ 前端触发 refresh 流程
           │
           ├─ refresh 成功 → 更新 token → 重试原请求
           └─ refresh 失败 → clearTokensAndRedirect()
```

---

## 二、现有问题清单

### 问题 1：Login 页面未使用 STORAGE_KEYS 常量

**文件**：`src/views/login/index.vue`（约第 77-78 行）

**现状**：
```typescript
localStorage.setItem('accessToken', response.data.accessToken)
localStorage.setItem('refreshToken', response.data.refreshToken)
```

**问题**：直接使用字符串字面量，没有引用 `STORAGE_KEYS.ACCESS_TOKEN`。目前因为值恰好一致所以不影响运行，但如果将来修改常量值，login 页面会与其他模块不一致。

**修改方案**：
```typescript
import { STORAGE_KEYS } from '@common/constants/storage'
// ...
localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken)
localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken)
```

---

### 问题 2：403 刷新逻辑的边界问题

**文件**：`src/common/utils/http.ts`

**现状**：响应拦截器分两个分支：
- **success 分支**（HTTP 200）：检查 `response.data.code === 403` 时只 reject，**不触发 refresh**
- **error 分支**（HTTP 403）：触发 refresh 流程

**实际影响**：
- 后端 AuthInterceptor 返回 token 过期时，HTTP Status 就是 **403**，走的是 error 分支 → **refresh 正常触发**
- success 分支的 `code === 403` 检查实际上不太可能被触发（后端不会返回 HTTP 200 + body code 403 的组合）
- 但 success 分支中 `code === 403` 的处理仍然有隐患：它构造了一个 fake error 对象然后 reject，但这个 reject **不会进入 error 拦截器**，所以永远不会走 refresh

**修改方案**：统一在 success 分支中也触发 refresh，或者移除 success 分支中对 403 的判断（因为后端不会这样返回）。推荐后者——简化逻辑：

```typescript
// success 拦截器：只处理 401（强制登出），其他交给各页面处理
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.code === 401) {
      clearTokensAndRedirect()
      return Promise.reject(new Error('登录信息已过期'))
    }
    // 移除对 code === 403 的判断，因为后端 token 过期返回的是 HTTP 403
    return response
  },
  // error 拦截器保持不变...
)
```

---

### 问题 3：401 跳转方式不一致

**现状**：
- `http.ts` 中：`window.location.href = '/login'`（整页刷新）
- `router/index.ts` 中：`return '/login'`（SPA 内跳转）
- `TopBar.vue` 退出登录：`router.push('/login')`（SPA 内跳转）

**问题**：`window.location.href` 会触发整页刷新，丢失所有 Pinia 状态、清空 Vue 实例，用户体验差（白屏闪烁）。

**修改方案**：统一使用 `router.push('/login')`。由于 `http.ts` 中不方便直接 import router（可能有循环依赖），推荐改为使用 `window.dispatchEvent` 通知 + 在 `App.vue` 中监听：

```typescript
// http.ts 中
const clearTokensAndRedirect = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  ElMessage.error('登录已过期，请重新登录')
  window.dispatchEvent(new CustomEvent('auth:logout'))
}

// App.vue 或 router/index.ts 中
window.addEventListener('auth:logout', () => {
  const userStore = useUserStore()
  userStore.clearAll()
  router.push('/login')
})
```

或者更简单的方式——直接在 http.ts 中延迟 import router：

```typescript
const clearTokensAndRedirect = async () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  ElMessage.error('登录已过期，请重新登录')
  const { default: router } = await import('@/router')
  router.push('/login')
}
```

---

### 问题 4：路由守卫中 fetchUserBasicInfo 失败时不会进入 catch

**文件**：`src/router/index.ts`

**现状**：
```typescript
if (!userStore.userInfo) {
  try {
    await userStore.fetchUserBasicInfo()
  } catch {
    userStore.clearAll()
    return '/login'
  }
}
```

**问题**：`fetchUserBasicInfo()` 内部已经 `try/catch` 了，失败时 **返回 false**，不会抛出异常。所以路由守卫的 `catch` 块**永远不会执行**。

**修改方案**：改为检查返回值：
```typescript
if (!userStore.userInfo) {
  const success = await userStore.fetchUserBasicInfo()
  if (!success) {
    userStore.clearAll()
    return '/login'
  }
}
```

---

### 问题 5：每个页面重复的 try/catch + response.code 检查

**涉及文件**：几乎所有 `views/` 下的页面

**现状示例**（`files/index.vue` 第 291-313 行）：
```typescript
const handlePreview = async (row: FileMetadataVO) => {
  try {
    previewUrl.value = ''
    previewLoading.value = true
    const response = await getPreviewUrl(row.id, 60)
    if (response.code === 200) {
      previewUrl.value = response.data
      setTimeout(() => {
        previewDialogVisible.value = true
        previewLoading.value = false
      }, 100)
    } else {
      ElMessage.error(response.msg || '获取预览链接失败')
      previewLoading.value = false
    }
  } catch (error) {
    ElMessage.error('预览失败')
    console.error('预览错误:', error)
    previewLoading.value = false
  }
}
```

**问题统计**：

| 页面 | try/catch 块数量 |
|------|-----------------|
| login/index.vue | 8 |
| login/register.vue | 4 |
| files/index.vue | 5 |
| score/index.vue | 9 |
| score/history.vue | 9 |
| demand/index.vue | 5 |
| demand/manage.vue | 5 |
| profile/index.vue | 5 |
| contact/index.vue | 8 |
| contact/college.vue | 6 |
| **合计** | **~64 个重复模式** |

每个 try/catch 块都在做同样的事：
1. 调用 API
2. 检查 `response.code === 200`
3. 成功：处理数据
4. 失败：`ElMessage.error(response.msg || '默认错误信息')`
5. catch：`ElMessage.error('操作失败')`

---

## 三、优化方案

### 3.1 封装统一请求工具函数 `useRequest`

在 `src/common/utils/` 下新增 `request.ts`，提供两个核心函数：

#### 方案 A：函数式封装（推荐，简单直接）

```typescript
// src/common/utils/request.ts
import { ElMessage } from 'element-plus'
import type { AxiosResponse } from 'axios'

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

/**
 * 统一请求封装 —— 自动处理 code 检查和错误提示
 * 
 * @param apiFn   - API 调用函数（返回 ApiResponse）
 * @param options - 可选配置
 * @returns data（成功时）或 null（失败时）
 * 
 * @example
 * const data = await request(() => getPreviewUrl(row.id, 60), {
 *   errorMsg: '获取预览链接失败'
 * })
 * if (data) { previewUrl.value = data }
 */
export async function request<T>(
  apiFn: () => Promise<ApiResponse<T>>,
  options: {
    errorMsg?: string       // 兜底错误信息
    showError?: boolean     // 是否自动弹错误提示，默认 true
    successMsg?: string     // 成功时弹提示（不传则不弹）
  } = {}
): Promise<T | null> {
  const { errorMsg = '操作失败', showError = true, successMsg } = options
  try {
    const response = await apiFn()
    if (response.code === 200) {
      if (successMsg) ElMessage.success(successMsg)
      return response.data
    } else {
      if (showError) ElMessage.error(response.msg || errorMsg)
      return null
    }
  } catch (error: any) {
    if (showError) {
      ElMessage.error(error?.response?.data?.msg || errorMsg)
    }
    console.error(`[Request Error] ${errorMsg}:`, error)
    return null
  }
}

/**
 * 带 loading 状态的请求封装
 * 
 * @example
 * const { execute, loading } = useLoading()
 * const data = await execute(
 *   () => request(() => updateStudentInfo(form), { successMsg: '更新成功' })
 * )
 */
export function useLoading() {
  const loading = ref(false)

  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    loading.value = true
    try {
      return await fn()
    } finally {
      loading.value = false
    }
  }

  return { loading, execute }
}
```

#### 使用前后对比

**优化前**（64 行）：
```typescript
const handlePreview = async (row: FileMetadataVO) => {
  try {
    previewUrl.value = ''
    previewLoading.value = true
    const response = await getPreviewUrl(row.id, 60)
    if (response.code === 200) {
      previewUrl.value = response.data
      setTimeout(() => {
        previewDialogVisible.value = true
        previewLoading.value = false
      }, 100)
    } else {
      ElMessage.error(response.msg || '获取预览链接失败')
      previewLoading.value = false
    }
  } catch (error) {
    ElMessage.error('预览失败')
    console.error('预览错误:', error)
    previewLoading.value = false
  }
}
```

**优化后**（10 行）：
```typescript
const handlePreview = async (row: FileMetadataVO) => {
  previewUrl.value = ''
  previewLoading.value = true
  const data = await request(() => getPreviewUrl(row.id, 60), {
    errorMsg: '获取预览链接失败'
  })
  previewLoading.value = false
  if (data) {
    previewUrl.value = data
    previewDialogVisible.value = true
  }
}
```

**再比如提交表单**：

优化前：
```typescript
const updateStudent = async () => {
  submitting.value = true
  try {
    const response = await updateStudentInfo(editForm.value)
    if (response.code === 200) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      await fetchUserInfo()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.msg || '更新失败')
  } finally {
    submitting.value = false
  }
}
```

优化后：
```typescript
const updateStudent = async () => {
  submitting.value = true
  const data = await request(() => updateStudentInfo(editForm.value), {
    successMsg: '更新成功',
    errorMsg: '更新失败',
  })
  submitting.value = false
  if (data !== null) {
    editDialogVisible.value = false
    await fetchUserInfo()
  }
}
```

### 3.2 API 层也可以简化

当前 API 函数也有重复包装：

```typescript
// 现状：每个 API 函数都有 try/catch
export const loginPost = async (logdto: LoginDto): Promise<LoginResType> => {
  try {
    const response = await apiClient.post<LoginResType>('/api/authserver/login', logdto)
    return response.data
  } catch (error) {
    throw new Error('登录请求失败,请稍后重试')
  }
}
```

**建议**：API 层只做"调用 + 返回"，不做 try/catch（错误由 `request()` 统一处理）：

```typescript
// 优化后：API 层只负责调接口
export const loginPost = async (logdto: LoginDto): Promise<LoginResType> => {
  const response = await apiClient.post<LoginResType>('/api/authserver/login', logdto)
  return response.data
}
```

这样错误会自然地被 `request()` 的 catch 捕获，避免了"错误被 API 层吃掉再抛出一个笼统的 new Error"的问题。

---

## 四、改动清单汇总

| 序号 | 文件 | 改动内容 | 优先级 |
|------|------|---------|--------|
| 1 | `src/common/utils/request.ts` | **新建** — 统一请求封装 `request()` 和 `useLoading()` | 高 |
| 2 | `src/common/utils/http.ts` | 修正 success 拦截器中 code===403 的处理；统一 401 跳转方式 | 高 |
| 3 | `src/router/index.ts` | 修正路由守卫中 fetchUserBasicInfo 的返回值检查 | 高 |
| 4 | `src/views/login/index.vue` | 引入 `STORAGE_KEYS` 替换字符串字面量 | 中 |
| 5 | `src/views/files/index.vue` | 用 `request()` 替换重复 try/catch | 中 |
| 6 | `src/views/profile/index.vue` | 同上 | 中 |
| 7 | `src/views/score/index.vue` | 同上 | 中 |
| 8 | `src/views/score/history.vue` | 同上 | 中 |
| 9 | `src/views/demand/index.vue` | 同上 | 中 |
| 10 | `src/views/demand/manage.vue` | 同上 | 中 |
| 11 | `src/views/contact/index.vue` | 同上 | 低 |
| 12 | `src/views/contact/college.vue` | 同上 | 低 |
| 13 | `src/api/components/apiLogin.ts` | 移除 API 层多余的 try/catch | 低 |
| 14 | `src/api/components/apiProfile.ts` | 同上 | 低 |

---

## 五、关于"重启后端后前端没退出"的解释

**这是正常行为，不是 bug。**

原因：
1. JWT Secret 是固定配置（`application.yml` 中写死），不是每次启动随机生成
2. 后端重启后，签名密钥不变 → 之前签发的 token 签名仍然有效
3. accessToken 有效期 30 分钟 → 只要没超过 30 分钟，token 就能正常使用
4. 即使 accessToken 过期了，refreshToken 有效期 7 天 → 自动刷新

**如果你想让后端重启后强制所有用户重新登录**，有以下方式（仅供了解，通常不需要）：
- 每次启动生成随机 Secret（不推荐，多实例部署会冲突）
- 引入 Redis 存储 token 黑名单/白名单
- 在 token 中加入版本号，重启后递增版本号

---

## 六、改动优先级建议

**第一批（核心修正）**：序号 1-4 —— 修正 token 逻辑 bug + 新建 request 封装

**第二批（逐步替换）**：序号 5-12 —— 各页面用 `request()` 替换重复 try/catch

**第三批（清理）**：序号 13-14 —— API 层 try/catch 清理
