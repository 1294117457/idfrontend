import apiClient from '@/utils/http'

// 发送验证码====
export interface EmailItem {
    status: string;
    validMinutes: number;
}

export const sendEmailCode = async (email: string) => {
  const response = await apiClient.post<{code:number;msg:string;data:EmailItem}>('/api/userinfo/sendEmailCode', { email });
  return response.data;
};

// 绑定学生信息===
export interface StudentItem {
  email: string;
  code: string;
  fullName: string;
  major: string;
  enrollmentYear: number;
  graduationYear: number;
}

export interface BindItem{
    status: string;
    studentId: string;
}

export const bindStudentInfo = async (studentData: StudentItem) => {
  const response = await apiClient.post<{code:number;msg:string;data:BindItem}>('/api/userinfo/bindStudentInfo', studentData);
  return response.data;
};

// 查询用户完整信息===
export interface UserInfoItem {
  userId: number;
  username: string;
  phone: string;
  email: string;

  studentId: string;
  studentEmail: string;
  fullName: string;
  enrollmentYear: number;
  graduationYear: number;
  major: string;
  gpa: number;
  academicScore: number;
  specialtyScore: number;
  comprehensiveScore: number;
  foreignLanguageLevel: string;
  disciplinaryViolations: number;
  failedCourses: number;
  specialSkillsRemark: string;
  isConfirmed: boolean; // ✅ 添加确认状态
}

export const getUserInfo = async () => {
  const response = await apiClient.get<{code:number;msg:string;data:UserInfoItem}>('/api/userinfo/getUserInfo');
  return response.data;
};

// 更新学生信息(需要验证码)===
export interface UpdateStudentItem {
  email: string;      // 新的学生邮箱
  code: string;       // 邮箱验证码
  fullName: string;   // 姓名
  major: string;      // 专业
}

export const updateStudentInfo = async (updateData: UpdateStudentItem) => {
  const response = await apiClient.put<{code:number;msg:string;data:string}>('/api/userinfo/updateStudentInfo', updateData);
  return response.data;
};
// ✅ 学生确认信息
export const confirmStudentInfo = async () => {
  const response = await apiClient.post<{code:number;msg:string;data:string}>('/api/userinfo/confirmStudentInfo');
  return response.data;
};