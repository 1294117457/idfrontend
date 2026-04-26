# Profile 页面优化完成报告

> 日期：2026-04-26 | 状态：代码已修改，编译通过

---

## 一、已完成的修改

### 1.1 后端修改（idbackend）

| 文件 | 修改内容 |
|------|---------|
| `UserInfoVO.java` | 新增 `private String avatar` 字段，使 `GET /api/user/complete-info` 返回头像 URL |
| `UserConverter.java` | `toUserInfoVO()` 新增 `vo.setAvatar(userPO.getAvatar())`；`mapToStudentDataVO()` 中 `getYear` → `getInteger` |
| `UserMapper.java` | `selectStudentsByCondition` 和 `selectUsersWithOptionalStudent` 中移除 `CAST(YEAR(...))` 包装，改为直接读 `u.grade` 和 `u.graduation_year` |
| `UserService.java` | `buildUserInfoJson` 中 `"enrollmentYear"` 改为 `"grade"` |

### 1.2 前端修改（idfrontend）

| 文件 | 修改内容 |
|------|---------|
| `views/profile/index.vue` | 1. `gradeOptions` 扩展到大五；2. `handleAvatarUpload` 成功后同步 `userStore`；3. 删除 `loadUserAvatar` / `userAvatarUrl` / `newAvatarFileId`，统一使用 `userStore.avatarUrl`；4. 简化 `showUserEditDialog`（删除 fileId 分支） |
| `api/components/apiProfile.ts` | 1. 修复 `getAvatarPreviewUrl` URL 双重拼接 bug（`${apiBaseUrl}/api/...` → `/api/...`）；2. `UserInfoItem` 新增 `avatar` 字段；3. 删除废弃的 `AvatarUploadResult` 接口 |
| `stores/user.ts` | 简化 `loadAvatarUrl`：移除 fileId 签名 URL 分支和过期时间缓存，只保留直链逻辑 |
| `views/home/index.vue` | 年级显示从 `` `大${grade}` `` 改为 `getGradeText(grade)` 函数 |

### 1.3 前端修改（idfrontend-admin）

| 文件 | 修改内容 |
|------|---------|
| `views/profile/index.vue` | `gradeOptions` 和 `getGradeText` 扩展到大五 |
| `views/student/index.vue` | `gradeOptions`、`getGradeLabel`、`getGradeTagType` 扩展到大五 |
| `views/account-manage/index.vue` | `getGradeLabel` 扩展到大五 |

### 1.4 需要你手动执行的数据库修改

```sql
-- 1. 修正已有数据（YEAR 类型的 2003 → TINYINT 的 3）
UPDATE users SET grade = YEAR(grade) - 2000 WHERE grade IS NOT NULL;

-- 2. 修改 grade 列类型
ALTER TABLE users MODIFY COLUMN grade TINYINT UNSIGNED DEFAULT NULL 
  COMMENT '年级: 1=大一, 2=大二, 3=大三, 4=大四, 5=大五';

-- 3. 修改 graduation_year 列类型（避免 YEAR 的隐式转换陷阱）
ALTER TABLE users MODIFY COLUMN graduation_year SMALLINT UNSIGNED DEFAULT NULL 
  COMMENT '预计毕业年份';

-- 4. 验证
SELECT id, full_name, grade, graduation_year FROM users WHERE full_name IS NOT NULL;
```

---

## 二、编译验证结果

| 项目 | 命令 | 结果 |
|------|------|------|
| idbackend | `mvn compile -q` | 通过 |
| idfrontend | `npx vue-tsc --noEmit` | 通过 |
| idfrontend-admin | `npx vue-tsc --noEmit` | 通过 |

---

## 三、优化后 Pinia 的作用

### 3.1 当前 Pinia Store 的职责

优化后 `useUserStore`（`stores/user.ts`）承担以下职责：

| 职责 | 说明 | 消费者 |
|------|------|--------|
| **全局用户基本信息** | `userInfo`：userId、username、phone、avatar、role | TopBar、Profile 页、侧边栏 |
| **全局学生信息** | `studentInfo`：fullName、grade、major、scores | Home 首页、Profile 页 |
| **头像 URL** | `avatarUrl`：从 `userInfo.avatar` 自动派生 | TopBar 的 `<el-avatar>`、Profile 页 |
| **登录状态** | `isLoggedIn`（基于 userInfo）、`hasToken`（基于 localStorage） | 路由守卫、Layout |
| **学生绑定状态** | `hasStudentInfo`：判断是否已绑定学生信息 | Home 页引导、Profile 页条件渲染 |
| **登出清理** | `clearAll()`：清空所有状态 + token | 退出登录时调用 |

### 3.2 Pinia 的本质作用

**Pinia 是 Vue 的全局状态管理工具，解决的核心问题是「跨组件数据共享」。**

在你的项目中，用户信息（用户名、头像等）需要在多个页面和组件间共享：
- TopBar 显示用户名和头像
- Home 首页显示学生年级、专业
- Profile 页显示完整信息

如果没有 Pinia，每个组件都要自己调 API 获取数据，导致：
1. 重复请求：TopBar 调一次、Home 调一次、Profile 再调一次
2. 数据不一致：Profile 里改了头像，TopBar 的头像不会更新
3. 无法共享状态：A 组件不知道 B 组件已经获取了数据

Pinia 作为「单一数据源」，所有组件从同一个 store 读数据，修改后全局生效。

### 3.3 Pinia 当前存在的问题

#### 问题 1：双数据源未合并

当前存在两个平行的数据获取路径：

```
路径 A：userStore.fetchUserBasicInfo() → GET /api/user/profile → UserDTO（有 avatar，无学生信息）
路径 B：页面本地 getUserInfo() → GET /api/user/complete-info → UserInfoVO（有学生信息 + avatar）
```

页面 `onMounted` 里要调两次接口，且 `userInfo`（Pinia）和 `userInfo`（页面 ref）同名但类型不同，容易混淆。

**改进方向**：后端 `GET /complete-info` 已经返回 avatar 了，可以让 store 直接调 `/complete-info` 一次性获取所有数据，不再需要分别调两个接口。但这需要评估 `/profile` 接口在其他地方的使用情况，不要贸然删除。

#### 问题 2：Store 没有持久化

当前用户刷新页面后 Pinia 状态丢失，需要重新调接口。对于频繁刷新的开发场景不友好。可以考虑用 `pinia-plugin-persistedstate` 插件将 `userInfo` 持久化到 `sessionStorage`。

#### 问题 3：`profile.ts` 中间层多余

`stores/profile.ts` 只有一行 `export { useUserStore } from './user'`，所有组件其实可以直接 `import { useUserStore } from '@/stores/user'`。这个文件只是历史遗留，不影响功能但增加理解成本。

#### 问题 4：fetchStudentInfo 在未绑定学生时会报错

`getStudentBasicInfo` 调用 `GET /api/user/student/info`，后端在 `fullName == null` 时抛出 `STUDENT_INFO_NOT_FOUND` 异常。这意味着对于新用户（还没绑定学生信息），`fetchStudentInfo` 总是会进入 catch 分支并在控制台打印错误，虽然不影响功能，但不够优雅。

---

## 四、CDN 是什么 & 头像反向代理

### 4.1 CDN（Content Delivery Network，内容分发网络）

CDN 是一种将静态资源（图片、JS、CSS 等）缓存到全球各地节点服务器的网络架构。用户访问时，从距离最近的节点获取资源，而不是每次都回源到你的 MinIO 服务器。

**当前你的头像访问链路：**

```
用户浏览器 → http://114.132.158.124:9000/avatars/xxx.jpg → 你的云服务器 MinIO
```

问题：
- 每次都直连服务器 IP，速度取决于用户和服务器的物理距离
- MinIO 直接暴露在公网，有安全隐患
- 没有缓存，大量用户并发时 MinIO 压力大

**加了 CDN 之后：**

```
用户浏览器 → https://cdn.yourdomain.com/avatars/xxx.jpg → CDN 边缘节点（已缓存）→ (首次) 你的 MinIO
```

**对你的项目来说**，头像场景可以先不上 CDN。更实际的方案是加一层 Nginx 反向代理。

### 4.2 Nginx 反向代理配置

反向代理的作用：用一个域名/统一端口代理多个后端服务，对外隐藏真实 IP 和端口。

**当前架构问题**：前端直接访问 `http://114.132.158.124:9000`（MinIO 裸端口），不安全也不优雅。

**推荐架构**：

```
                                    ┌─ /api/*     → localhost:8080 (Spring Boot)
用户 → https://yourdomain.com ──→ Nginx ─┤
                                    └─ /avatars/* → localhost:9000 (MinIO avatars bucket)
```

**Nginx 配置示例**：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态资源
    location / {
        root /var/www/idfrontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # MinIO 头像反向代理（公开读取，不需要认证）
    location /avatars/ {
        proxy_pass http://127.0.0.1:9000/avatars/;
        proxy_set_header Host $host;
        
        # 缓存头像（浏览器缓存 7 天）
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

加了这层代理后，后端 `MinioUtil.getPublicAvatarUrl` 应返回 `https://yourdomain.com/avatars/xxx.jpg`，而不是 `http://114.132.158.124:9000/avatars/xxx.jpg`。

**对你当前开发阶段**：可以暂不部署 Nginx，等项目上线或答辩时再配置。开发阶段直连 MinIO IP 没问题。

### 4.3 最简反代方案（Vite dev proxy）

如果只是开发阶段想解决跨域问题，可以在 `vite.config.ts` 中配置 proxy：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/avatars': {
        target: 'http://114.132.158.124:9000',
        changeOrigin: true,
      }
    }
  }
})
```

---

## 五、仍然存在的其他问题

### 5.1 用户完整信息页面没有显示头像（CSS 层面）

`GET /complete-info` 现在返回 avatar 了，但 profile 页面的学生信息卡片区域没有展示头像。头像只在用户基本信息卡片中通过 `userStore.avatarUrl` 展示。如果用户还没执行 `fetchUserBasicInfo()`（Pinia store 为空），头像不会显示。建议页面也可以 fallback 到 `userInfo.value?.avatar`。

### 5.2 头像裁剪

当前上传头像没有裁剪功能，用户上传一张横向 16:9 的照片，`<el-avatar>` 会以圆形裁剪显示中心区域，可能不理想。可以考虑后续集成 `vue-cropper` 组件。

### 5.3 `fetchUserData` 在 Pinia store 中不存在

idfrontend-admin 的 `profile/index.vue` 第 201 行调用了 `userStore.fetchUserData()`，但 admin 项目的 store 定义需要确认是否存在该方法（与 idfrontend 的 store 不同）。

### 5.4 两个前端项目的 store 不统一

`idfrontend` 的 store 已经优化（直链头像），但 `idfrontend-admin` 的 store（`stores/profile.ts`）是独立实现的，可能还有旧版逻辑。建议后续将公共的 store 逻辑抽取到 `common/` 目录共享。

### 5.5 错误处理仍然分散

每个请求函数仍然有独立的 try-catch + ElMessage.error，建议后续在 axios 拦截器中统一处理业务 code !== 200 的情况（上一轮对话中已讨论）。

### 5.6 `fetchUserInfo` 和 store 数据可能不同步

profile 页面 `onMounted` 先调 `userStore.fetchUserBasicInfo()`（从 `/profile` 获取），再调 `fetchUserInfo()`（从 `/complete-info` 获取）。如果用户在其他页面修改了学生信息，store 中的 `studentInfo` 可能是旧的，而页面 ref 的 `userInfo` 是新的。
