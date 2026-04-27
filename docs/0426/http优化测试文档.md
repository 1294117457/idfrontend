# HTTP 优化测试文档

> 生成时间：2026-04-26  
> TypeScript 编译：idfrontend ✅ 通过 | idfrontend-admin ✅ 通过

---

## 一、改动清单

### 核心改动

| 文件 | 改动内容 |
|------|---------|
| `idfrontend/src/common/utils/http.ts` | 重写响应拦截器：自动弹 success/error toast；直接返回 `res`（而非 AxiosResponse）；`clearTokensAndRedirect` 改用 `router.push` 替代 `window.location.href`；移除 success 分支中对 code 403 的处理 |
| `idfrontend-admin/src/common/utils/http.ts` | 同步相同改动；额外将 refresh token 逻辑从 `import { refreshToken }` 改为内联 `doRefreshToken`（避免循环依赖） |
| `idfrontend/src/router/index.ts` | 路由守卫中 `fetchUserBasicInfo` 从 try/catch 改为检查返回值 |
| `idfrontend/src/views/login/index.vue` | 引入 `STORAGE_KEYS` 常量替换所有字符串字面量；简化 `submitLogin`、`bindWorkToExistingAccount`、`bindToExistingAccount` |

### 页面层优化

| 文件 | 简化的函数 | 改动说明 |
|------|-----------|---------|
| `views/files/index.vue` | `loadFiles`、`handlePreview`、`handleDownload`、`confirmRename` | 移除 code 判断 + ElMessage 调用；移除未使用的 `ElMessage`/`ElMessageBox`/`UploadRequestOptions` 导入 |
| `views/profile/index.vue` | `fetchUserInfo`、`handleAvatarUpload`、`handleUpdateUserInfo`、`bindStudent`、`updateStudent` | 移除 code 判断 + 手动 success/error 弹窗 |
| `views/home/index.vue` | `onMounted` 中的 `getScoreFieldConfigs` | 移除 `res.code === 200` 判断 |

---

## 二、拦截器行为说明

### 成功响应（HTTP 200 + body code 200）

| 请求方法 | 后端 msg | 前端行为 |
|---------|---------|---------|
| GET | 任意 | 不弹窗，直接返回数据 |
| POST / PUT / DELETE | "更新成功"、"删除成功"等 | **自动弹** `ElMessage.success(msg)` |
| POST / PUT / DELETE | "成功"（默认泛泛 msg） | 不弹窗（被过滤） |

### 失败响应（HTTP 200 + body code ≠ 200）

自动弹 `ElMessage.error(msg || '请求失败')`，然后 reject。页面的 catch 或 finally 会执行。

### 网络错误 / HTTP 非 200

- **401** → 清 token + `router.push('/login')`
- **403** → refresh token → 重试
- **其他** → 自动弹 `ElMessage.error(后端msg || '网络异常，请稍后重试')`

---

## 三、测试用例

### 3.1 登录流程

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| 正常登录 | 输入正确用户名/密码/验证码，点击登录 | 弹出 "登录成功" → 跳转到 /home |
| 错误密码 | 输入错误密码 | 弹出后端返回的错误信息（如"用户名或密码错误"） |
| 错误验证码 | 输入错误验证码 | 弹出 "验证码错误" |
| token 存储 | 登录成功后检查 localStorage | `accessToken` 和 `refreshToken` 均已存储 |

### 3.2 路由守卫

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| 未登录访问保护页 | 清除 localStorage 后直接访问 /home | 弹出 "请先登录" → 跳转 /login |
| 已登录访问登录页 | 登录状态下访问 /login | 自动重定向到 /home/index |
| token 失效 | 修改 localStorage 中的 accessToken 为无效值，然后访问保护页 | 路由守卫调用 fetchUserBasicInfo 失败 → clearAll → 跳转 /login |

### 3.3 Token 刷新

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| accessToken 过期 | 等待 30 分钟或手动修改 token 使其过期 | 后端返回 403 → 自动用 refreshToken 刷新 → 请求自动重试 → 用户无感知 |
| refreshToken 也过期 | 等待 7 天或清除 refreshToken | 刷新失败 → 弹出 "登录已过期" → SPA 内跳转 /login（不再整页刷新） |

### 3.4 文件管理页（files/index.vue）

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| 加载文件列表 | 进入文件管理页 | 表格正常加载，loading 状态正确显示/隐藏，**无弹窗** |
| 预览文件 | 点击 PDF 文件的"预览"按钮 | 预览弹窗打开，预览加载 loading 正常，**无弹窗** |
| 下载文件 | 点击"下载"按钮 | 文件正常下载，**无弹窗**（GET 请求不弹） |
| 重命名 | 修改文件名并确认 | 弹出 "修改成功"（后端 PUT 返回的 msg） |
| 接口失败 | 后端返回非 200 | 自动弹出后端 msg 错误提示 |

### 3.5 个人信息页（profile/index.vue）

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| 加载用户信息 | 进入个人信息页 | 页面正常加载，loading spinner 正确显示/隐藏 |
| 上传头像 | 选择图片上传 | 弹出 "头像上传成功"（后端 msg）；头像预览更新 |
| 更新用户信息 | 修改手机号，点击确定修改 | 弹出 "更新成功"；弹窗关闭 |
| 绑定学生信息 | 填写信息，点击确定绑定 | 弹出 "绑定成功"；弹窗关闭；页面刷新显示新信息 |
| 修改学生信息 | 修改年级，点击确定修改 | 弹出 "更新成功"；弹窗关闭 |
| 表单验证 | 不填姓名就点提交 | 弹出 "请填写完整信息"（这是页面本地验证，不走拦截器） |
| 手机号格式错误 | 输入不合法手机号 | 弹出 "请输入正确的手机号格式"（页面本地验证） |

### 3.6 首页（home/index.vue）

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| 加载首页 | 进入首页 | 正常显示成绩概览、功能卡片，**无弹窗** |
| 分数字段配置加载失败 | 后端 fieldConfig 接口异常 | 静默降级到默认显示，**无弹窗**（catch 吞掉错误） |

### 3.7 401 跳转方式验证

| 测试项 | 操作 | 预期结果 |
|-------|------|---------|
| 旧行为对比 | token 过期后发请求 | 弹出 "登录已过期" → **SPA 内跳转**到 /login（页面不整体刷新，URL 平滑变化） |

---

## 四、代码量变化统计

| 文件 | 优化前 (行) | 优化后 (行) | 减少 |
|------|------------|------------|------|
| common/utils/http.ts | 147 | 145 | -2 (逻辑更清晰) |
| router/index.ts | 47 | 45 | -2 |
| views/login/index.vue | 805 | ~790 | -15 |
| views/files/index.vue | 446 | ~420 | -26 |
| views/profile/index.vue | 504 | ~480 | -24 |
| views/home/index.vue | 403 | 402 | -1 |

**总计减少约 70 行样板代码**，且后续每个新页面/新请求的代码量也减少。

---

## 五、注意事项

1. **页面中仍保留的 ElMessage 用途**：表单验证提示（`ElMessage.warning('请填写完整信息')`）——这不是 API 响应，所以仍然由页面控制
2. **拦截器直接返回 `res`**（即 `{ code, msg, data }`）：API 函数签名 `Promise<ApiResponse<T>>` 不变，但实际返回值已经是 `response.data` 而非 `AxiosResponse`。由于 API 层已经在做 `return response.data`，现在变成 `return res`（res 就是 response.data），效果等价
3. **catch 块**：由于拦截器已经 reject，页面的 `try/finally` 中如果请求失败会直接跳到 finally。如果页面有 catch 块且为空（`catch {}`），表示"拦截器已处理，我不需要额外操作"
4. **idfrontend-admin 的页面层**目前未改动，可以在后续逐步按同样模式简化
