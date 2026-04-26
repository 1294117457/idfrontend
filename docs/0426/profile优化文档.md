# Profile 个人信息页面优化文档

> 针对 `idfrontend/src/views/profile/index.vue` 页面的问题排查与优化方案
> 
> 日期：2026-04-26

---

## 一、问题 1：头像上传显示失败

### 1.1 问题定位

**根因：后端 `UserInfoVO` 没有 `avatar` 字段，导致前端拿不到头像 URL。**

完整调用链分析：

| 步骤 | 操作 | 结果 |
|------|------|------|
| ① 上传头像 | `POST /api/file/avatar` | 后端返回公开 URL（如 `http://114.132.158.124:9000/avatars/xxx.jpg`），**写入 `users.avatar`** |
| ② 前端展示 | 调用 `handleAvatarUpload` → `response.data` 拿到 URL | 弹窗内预览正常（因为直接用了返回值） |
| ③ 保存后刷新 | `fetchUserInfo()` → `GET /api/user/complete-info` | **返回的 `UserInfoVO` 不含 `avatar` 字段** |
| ④ 页面展示 | `userInfo.value?.avatar` | **undefined → 头像显示失败** |

**后端证据：**

`UserInfoVO.java` 字段列表：
```java
// ===== 用户信息 =====
private Integer userId;
private String username;
private String phone;
// ❌ 没有 avatar 字段！

// ===== 学生信息 =====
private String fullName;
private String major;
private Integer grade;
// ...
```

`UserConverter.toUserInfoVO()` 转换逻辑：
```java
vo.setUserId(userPO.getId());
vo.setUsername(userPO.getUsername());
vo.setPhone(userPO.getPhone());
// ❌ 缺少 vo.setAvatar(userPO.getAvatar())
```

**同时存在的次要问题：**

1. **前端 Pinia store 的 `loadAvatarUrl` 有冗余的旧版兼容逻辑**：store 中仍保留了 `fileId → getAvatarPreviewUrl(fileId)` 的签名 URL 方式，但后端已改为直链 URL。这段代码永远不会走到，但增加了复杂度。

2. **`profile/index.vue` 中 `loadUserAvatar` 函数与 store 的 `loadAvatarUrl` 功能重复**：页面本地又实现了一遍完全相同的 http/fileId 判断逻辑。

### 1.2 修复方案

#### 后端修改（必须）

**文件：`UserInfoVO.java`**
```java
// ===== 用户信息 =====
private Integer userId;
private String username;
private String phone;
private String avatar;  // ✅ 新增
```

**文件：`UserConverter.java` → `toUserInfoVO` 方法**
```java
vo.setUserId(userPO.getId());
vo.setUsername(userPO.getUsername());
vo.setPhone(userPO.getPhone());
vo.setAvatar(userPO.getAvatar());  // ✅ 新增
```

#### 前端修改（建议）

**文件：`apiProfile.ts` → `UserInfoItem` 接口**
```typescript
export interface UserInfoItem {
  userId: number
  username: string
  phone?: string
  avatar?: string  // ✅ 确认已有（当前已有，OK）
  // ...
}
```

**文件：`profile/index.vue` → 简化头像展示逻辑**

当前页面 `loadUserAvatar` 函数可以删除，统一使用 `userStore.avatarUrl`：
```vue
<!-- 改为 -->
<el-avatar :size="80" :src="userStore.avatarUrl">
  <el-icon :size="40"><User /></el-icon>
</el-avatar>
```

**文件：`stores/user.ts` → 简化 `loadAvatarUrl`**

删除 `fileId → getAvatarPreviewUrl` 的旧版分支，只保留直链逻辑：
```typescript
const loadAvatarUrl = async (): Promise<string> => {
  const avatar = userInfo.value?.avatar
  if (!avatar) {
    avatarUrl.value = ''
    return ''
  }
  // 后端现在始终返回直链 URL
  avatarUrl.value = avatar
  return avatar
}
```

### 1.3 头像存储方案评估

当前方案已经是**最佳实践**：

| 设计点 | 当前实现 | 评估 |
|--------|---------|------|
| 独立 bucket | ✅ `avatars` bucket（与业务文件 `id-bucket` 分离） | 正确 |
| 公开读取 | ✅ `setBucketPublicPolicy(avatarBucketName)` | 正确，头像天然公开 |
| 返回直链 | ✅ `endpoint/avatars/uuid.jpg` | 正确，无签名过期问题 |
| 旧头像清理 | ✅ 上传新头像时删除旧头像 | 正确，避免存储泄漏 |
| DB 存储 | ✅ `users.avatar` 存 URL 字符串 | 正确 |

**唯一需要注意**：MinIO endpoint `http://114.132.158.124:9000` 是内网/公网 IP 直连，生产环境建议加 CDN 或 Nginx 反代。

---

## 二、问题 2：年级显示为 "2003级" 而非 "大三"

### 2.1 根因分析

**根因：数据库 `grade` 字段类型为 MySQL `YEAR`，而不是 `TINYINT`/`INT`。**

```sql
-- backup0426.sql 第 640 行
`grade` year DEFAULT NULL,
`graduation_year` year DEFAULT NULL,
```

MySQL `YEAR` 类型的行为：
- 存入 `3` → MySQL 自动转为 `2003`（YEAR 类型将 0-69 映射到 2000-2069，70-99 映射到 1970-1999）
- 存入 `1` → 变成 `2001`
- 存入 `4` → 变成 `2004`

**完整数据流：**

```
前端选择 "大三" → grade=3 → POST /api/user/student/bind → 后端 Integer grade=3
→ SQL: UPDATE users SET grade=3 → MySQL YEAR 类型自动转为 2003
→ SELECT * FROM users → Java 读出 grade=2003
→ 前端收到 grade=2003 → getGradeText(2003) → gradeMap[2003] 匹配不到 → 显示 "年级2003"
```

**后端加剧问题的代码：**

`UserMapper.java` 管理员列表查询中用了 `CAST(YEAR(u.grade) AS SIGNED) AS grade`，这在列表页返回的是年份数字（如 2003）。但 `selectById` 是 `SELECT *`，MyBatis 直接把 YEAR 类型映射为 Integer，值也是 2003。

### 2.2 修复方案

#### 方案：将 `grade` 列改为 `TINYINT`（推荐）

**数据库 DDL：**
```sql
-- 1. 先把已有数据从 YEAR 值转回正确的年级数字
-- 注意：如果已有数据是 2001/2002/2003/2004，需要转为 1/2/3/4
UPDATE users SET grade = YEAR(grade) - 2000 WHERE grade IS NOT NULL AND YEAR(grade) BETWEEN 2001 AND 2005;

-- 2. 修改列类型
ALTER TABLE users MODIFY COLUMN grade TINYINT UNSIGNED DEFAULT NULL COMMENT '年级: 1=大一, 2=大二, 3=大三, 4=大四, 5=大五';

-- 同理修复 graduation_year（这个应该保持 YEAR 类型或改为 SMALLINT）
-- graduation_year 存的是实际年份如 2028，YEAR 类型在这里是合理的
-- 但建议改为 SMALLINT 避免 YEAR 类型的 0-69 自动映射问题
ALTER TABLE users MODIFY COLUMN graduation_year SMALLINT UNSIGNED DEFAULT NULL COMMENT '毕业年份';
```

**后端 `UserPO.java`**：无需修改，`Integer grade` 兼容 TINYINT。

**后端 `UserMapper.java`**：管理员查询中的 `CAST(YEAR(u.grade) AS SIGNED) AS grade` 需要改为直接 `u.grade AS grade`：
```java
// 修改前
CAST(YEAR(u.grade) AS SIGNED) AS grade,
CAST(YEAR(u.graduation_year) AS SIGNED) AS graduation_year

// 修改后
u.grade AS grade,
u.graduation_year AS graduation_year
```

涉及的 SQL 有两处：
1. `selectStudentsByCondition` 中的 SELECT 和 WHERE
2. `selectUsersWithOptionalStudent` 中的 SELECT

**后端 `UserConverter.java`**：`mapToStudentDataVO` 中的 `getYear(map, "grade")` 改为 `getInteger(map, "grade")`：
```java
// 修改前
vo.setGrade(getYear(map, "grade"));
vo.setGraduationYear(getYear(map, "graduation_year"));

// 修改后
vo.setGrade(getInteger(map, "grade"));
vo.setGraduationYear(getInteger(map, "graduation_year"));
```

**前端：年级选项扩展到大五**

`profile/index.vue` → `gradeOptions` 和 `getGradeText`：
```typescript
const gradeOptions = [
  { label: '大一', value: 1 },
  { label: '大二', value: 2 },
  { label: '大三', value: 3 },
  { label: '大四', value: 4 },
  { label: '大五', value: 5 },  // ✅ 新增：五年制专业
]

const getGradeText = (grade?: number) => {
  if (!grade) return '-'
  const gradeMap: Record<number, string> = {
    1: '大一', 2: '大二', 3: '大三', 4: '大四', 5: '大五'
  }
  return gradeMap[grade] || `年级${grade}`
}
```

**注意**：`home/index.vue` 中也有年级展示 `` `大${grade}` ``，改列类型后这里自然修复（grade=3 → "大3"），但最好也用 `getGradeText` 统一处理。

### 2.3 关于 `graduation_year` 字段

`graduation_year` 存的是实际年份（如 2028），当前用 `YEAR` 类型在语义上是对的，但为了避免 YEAR 类型的隐式转换陷阱（比如存 `28` 会变成 `2028`），建议统一改为 `SMALLINT UNSIGNED`，更安全可控。

---

## 三、其他逻辑问题排查

### 3.1 `GET /complete-info` 缺少 `avatar` 字段（已在问题 1 中覆盖）

前端 `UserInfoItem` 接口定义了 `avatar?: string` 但后端 `UserInfoVO` 不返回该字段，导致前端始终拿不到。

### 3.2 `getAvatarPreviewUrl` 存在 URL 拼接 bug

```typescript
// apiProfile.ts 第 79-84 行
export const getAvatarPreviewUrl = async (
  fileId: number, 
  expiryMinutes: number = 60
): Promise<ApiResponse<string>> => {
  const response = await apiClient.get(`${apiBaseUrl}/api/file/${fileId}/preview`, {
    params: { expiryMinutes }
  })
  return response.data
}
```

`apiClient` 已经配置了 `baseURL: VITE_BASE_API`，这里又手动拼了 `${apiBaseUrl}`，会导致 **URL 双重拼接**：
- 实际请求变成 `http://xxx:8080/http://xxx:8080/api/file/1/preview`

**修复**：如果后端已改为直链 URL 方案，这个函数可以直接删除。若保留则应改为：
```typescript
const response = await apiClient.get(`/api/file/${fileId}/preview`, { ... })
```

### 3.3 前端 `fetchUserInfo` 和 Pinia store 数据不同步

当前页面 `profile/index.vue` 中存在**两套平行的数据源**：

| 数据源 | 获取方式 | 用途 |
|--------|---------|------|
| `userInfo` (页面 ref) | `getUserInfo()` → `GET /complete-info` | 页面展示用户+学生信息 |
| `userStore.userInfo` (Pinia) | `getUserBasicInfo()` → `GET /profile` | TopBar 头像、用户名 |

问题：
1. `GET /profile` 返回 `UserDTO`（有 avatar，无学生信息）
2. `GET /complete-info` 返回 `UserInfoVO`（无 avatar，有学生信息）
3. 页面中 `el-avatar` 用 `userAvatarUrl`（来自 Pinia → `/profile` 接口）
4. 页面中学生信息用 `userInfo`（来自 `/complete-info` 接口）

**修改后端使 `/complete-info` 也返回 avatar 后**，可以考虑统一为一个数据源。

### 3.4 `handleAvatarUpload` 成功后未更新页面 ref 的 `userInfo`

```typescript
// 当前代码（idfrontend profile）
const handleAvatarUpload = async (options: UploadRequestOptions) => {
  // ...
  if (response.code === 200) {
    const avatarUrl = response.data
    newAvatarFileId.value = null
    userEditForm.value.avatar = avatarUrl
    avatarPreviewUrl.value = avatarUrl
    ElMessage.success('头像上传成功')
    // ❌ 没有更新 userStore 和 userInfo
  }
}
```

对比 `idfrontend-admin` 的版本，已经有 `userStore.updateUserInfo({ avatar: response.data })`，但 `idfrontend` 的版本漏了这步。

### 3.5 `buildUserInfoJson` 中 `grade` 语义混乱

```java
// UserService.java 第 63 行
info.put("enrollmentYear", user.getGrade() != null ? user.getGrade() : 0);
```

`grade` 应该是年级（1-5），这里 key 叫 `enrollmentYear`（入学年份），语义完全不同。修改 `grade` 列类型为 TINYINT 后，此处应改为 `"grade"` 或添加专门的 `enrollment_year` 字段。

---

## 四、Pinia Store 分析与优化建议

### 4.1 当前 Store 结构

```
stores/
├── profile.ts    → 仅 re-export: export { useUserStore } from './user'
└── user.ts       → 实际的 Pinia store
```

### 4.2 当前 Pinia 的作用

`useUserStore` 承担了以下职责：

| 职责 | 具体内容 |
|------|---------|
| **全局用户状态缓存** | `userInfo`（UserBasicInfo）、`studentInfo`（StudentBasicInfo） |
| **登录状态判断** | `isLoggedIn`（基于 userInfo）、`hasToken`（基于 localStorage） |
| **头像 URL 管理** | `avatarUrl` + 过期时间缓存 + 自动刷新 |
| **跨组件数据共享** | TopBar 用 `userStore.avatarUrl`，profile 页面用 `userStore.userInfo` |
| **数据获取** | `fetchUserBasicInfo()`、`fetchStudentInfo()`、`loadAvatarUrl()` |
| **登出清理** | `clearAll()` 清空所有状态和 token |

### 4.3 存在的问题

1. **`profile.ts` 多余**：只有一行 re-export，可以直接在组件中 `import { useUserStore } from '@/stores/user'`

2. **数据拆分过细**：`userInfo` 和 `studentInfo` 分别从两个接口获取，但后端已经合并到 `users` 单表，完全可以用一个 `/complete-info` 接口一次获取

3. **头像缓存过度设计**：`avatarUrlExpireTime` + 5分钟 buffer 的过期机制是为签名 URL 设计的，改为直链 URL 后不再需要

4. **API 调用散落**：页面中直接调用 API 函数（`getUserInfo()`），又同时调用 store 的 `fetchUserBasicInfo()`，两者获取的数据有重叠

### 4.4 推荐优化

#### Store 数据应该存什么（Pinia 的正确定位）

Pinia 适合存储**跨页面共享的全局状态**：

| 应该放 Pinia | 不应该放 Pinia |
|-------------|---------------|
| 登录用户基本信息（userId、username、avatar、role） | 当前页面的表单编辑状态 |
| 登录状态（isLoggedIn） | 临时 loading 状态 |
| Token 管理 | 弹窗的 visible 状态 |
| 头像 URL（全局用：TopBar、侧边栏等） | 页面级数据列表 |

#### 优化后的 Store 结构建议

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  // 核心状态：一次性从 /complete-info 获取
  const user = ref<UserCompleteInfo | null>(null)
  
  // 计算属性
  const isLoggedIn = computed(() => !!user.value)
  const hasStudentInfo = computed(() => !!user.value?.fullName)
  const avatarUrl = computed(() => user.value?.avatar || '')
  
  // 获取完整用户信息（登录后调用一次）
  const fetchUser = async () => {
    const res = await getUserCompleteInfo()  // 后端加上 avatar 后
    user.value = res.data
  }
  
  // 局部更新（避免重复请求）
  const updateUser = (partial: Partial<UserCompleteInfo>) => {
    if (user.value) user.value = { ...user.value, ...partial }
  }
  
  const logout = () => {
    user.value = null
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  }
  
  return { user, isLoggedIn, hasStudentInfo, avatarUrl, fetchUser, updateUser, logout }
})
```

这样：
- 页面只需 `userStore.fetchUser()` 一次，不需要分别调两个接口
- TopBar 直接用 `userStore.avatarUrl`
- Profile 页面直接用 `userStore.user` 展示，编辑表单用本地 ref
- 保存后 `updateUser({ avatar: newUrl })` 局部更新，无需整体 refetch

---

## 五、修改清单总览

### 后端修改

| 序号 | 文件 | 修改内容 | 优先级 |
|------|------|---------|--------|
| B1 | **SQL DDL** | `grade` 列从 `YEAR` 改为 `TINYINT UNSIGNED`；`graduation_year` 从 `YEAR` 改为 `SMALLINT UNSIGNED` | 🔴 高 |
| B2 | **UserInfoVO.java** | 新增 `private String avatar` 字段 | 🔴 高 |
| B3 | **UserConverter.java** | `toUserInfoVO` 新增 `vo.setAvatar(userPO.getAvatar())` | 🔴 高 |
| B4 | **UserMapper.java** | `selectStudentsByCondition` 和 `selectUsersWithOptionalStudent` 中的 `CAST(YEAR(u.grade) AS SIGNED)` 改为 `u.grade`，`YEAR(u.grade) = #{grade}` 改为 `u.grade = #{grade}`；`graduation_year` 同理 | 🔴 高 |
| B5 | **UserConverter.java** | `mapToStudentDataVO` 中 `getYear(map, "grade")` 改为 `getInteger(map, "grade")` | 🟡 中 |
| B6 | **UserService.java** | `buildUserInfoJson` 中 `enrollmentYear` key 修正 | 🟢 低 |

### 前端修改

| 序号 | 文件 | 修改内容 | 优先级 |
|------|------|---------|--------|
| F1 | **profile/index.vue** | `gradeOptions` 和 `getGradeText` 扩展到大五（value: 5） | 🔴 高 |
| F2 | **profile/index.vue** | `handleAvatarUpload` 成功后同步更新 `userStore` | 🔴 高 |
| F3 | **profile/index.vue** | 删除 `loadUserAvatar` 函数，统一使用 `userStore.avatarUrl` | 🟡 中 |
| F4 | **apiProfile.ts** | `getAvatarPreviewUrl` 修复 URL 双重拼接 bug（或直接删除） | 🟡 中 |
| F5 | **stores/user.ts** | 简化 `loadAvatarUrl`，移除 fileId 旧版兼容逻辑 | 🟡 中 |
| F6 | **home/index.vue** | 年级展示统一用 `getGradeText` 而非 `` `大${grade}` `` | 🟢 低 |
| F7 | **stores/profile.ts** | 可删除，各组件直接 import `@/stores/user` | 🟢 低 |

### 建议执行顺序

```
1. B1 → 修改数据库 grade 列类型（先修数据！）
2. B4 → 修改 Mapper SQL
3. B5 → 修改 Converter
4. B2 + B3 → UserInfoVO 加 avatar 字段
5. F1 → 前端年级选项扩展到大五
6. F2 + F3 → 前端头像逻辑统一
7. F4 + F5 → 清理冗余代码
```

---

## 六、数据迁移脚本

修改 `grade` 列之前，需要先修正已有数据：

```sql
-- ============ 数据迁移（在 ALTER 之前执行）============

-- 查看当前 grade 数据
SELECT id, full_name, grade, YEAR(grade) AS grade_year FROM users WHERE grade IS NOT NULL;

-- 将 YEAR 值转回年级数字（2001→1, 2002→2, 2003→3, 2004→4, 2005→5）
UPDATE users 
SET grade = YEAR(grade) - 2000 
WHERE grade IS NOT NULL;

-- 确认转换结果
SELECT id, full_name, grade FROM users WHERE grade IS NOT NULL;

-- ============ DDL 变更 ============

ALTER TABLE users MODIFY COLUMN grade TINYINT UNSIGNED DEFAULT NULL 
  COMMENT '年级: 1=大一, 2=大二, 3=大三, 4=大四, 5=大五';

ALTER TABLE users MODIFY COLUMN graduation_year SMALLINT UNSIGNED DEFAULT NULL 
  COMMENT '预计毕业年份（如 2028）';

-- ============ 验证 ============
DESC users;
SELECT id, full_name, grade, graduation_year FROM users WHERE full_name IS NOT NULL;
```
