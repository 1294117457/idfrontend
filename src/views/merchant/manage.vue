<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center">
        <h4 class="text-[20px] font-bold text-gray-800">商户管理</h4>
      </div>

      <!-- 搜索区域 -->
      <el-row justify="space-between" align="bottom" class="filter mb-4">
        <el-row align="bottom" :gutter="20" style="width: 85%">
          <el-col :span="6">
            <label class="text-sm">商户名称</label>
            <el-input v-model="searchName" placeholder="搜索商户名称" clearable />
          </el-col>
          <el-col :span="6">
            <label class="text-sm mb-1">商户类型</label>
            <el-select
              v-model="searchType"
              placeholder="选择商户类型"
              clearable
              style="width: 100%"
            >
              <el-option value="个体商户" label="个体商户" />
              <el-option value="企业商户" label="企业商户" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <label class="text-sm mb-1">商户状态</label>
            <el-select
              v-model="searchStatus"
              placeholder="选择商户状态"
              clearable
              style="width: 100%"
            >
              <el-option :value="1" label="正常" />
              <el-option :value="0" label="已禁用" />
            </el-select>
          </el-col>
          <el-row class="mt-4">
            <el-button type="primary" @click="handleFilter">筛选</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-row>
        </el-row>
      </el-row>

      <!-- 表格部分 -->
      <el-table
        class="mt-5"
        :data="paginatedData"
        table-layout="auto"
        border
        stripe
        :header-cell-style="{ background: '#eef1f6', color: '#606266' }"
      >
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">
            <div class="flex justify-center items-center">
              {{ $index + 1 + (currentPage - 1) * pageSize }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="id" label="商户ID" width="80" align="center" />
        <el-table-column prop="name" label="商户名称" width="150" align="center" />
        <el-table-column prop="type" label="商户类型" width="100" align="center" />
        <el-table-column prop="address" label="商户地址" min-width="180" align="center" />
        <el-table-column prop="phone" label="联系电话" width="120" align="center" />
        <el-table-column prop="legalPerson" label="法人代表" width="100" align="center" />

        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" width="150" align="center" />

        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 1"
              type="danger"
              size="small"
              @click="handleStatusChange(row, 0)"
            >
              禁用
            </el-button>
            <el-button v-else type="success" size="small" @click="handleStatusChange(row, 1)">
              恢复
            </el-button>
            <el-button type="primary" size="small" @click="handleViewDetail(row)"> 详情 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-row justify="end" align="middle" class="mt-5">
        <el-pagination
          class="flex justify-end"
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[5, 10, 15, 20]"
          :total="totalItems"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </el-row>
    </el-card>

    <!-- 商户详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="商户详情" width="600px">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商户ID：</span>
          <span>{{ selectedMerchant?.id }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商户名称：</span>
          <span>{{ selectedMerchant?.name }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商户类型：</span>
          <span>{{ selectedMerchant?.type }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商户状态：</span>
          <el-tag :type="selectedMerchant?.status === 1 ? 'success' : 'danger'" size="small">
            {{ selectedMerchant?.status === 1 ? '正常' : '已禁用' }}
          </el-tag>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">联系电话：</span>
          <span>{{ selectedMerchant?.phone }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">法人代表：</span>
          <span>{{ selectedMerchant?.legalPerson }}</span>
        </div>
        <div class="text-[14px] text-gray-700 col-span-2">
          <span class="font-semibold">商户地址：</span>
          <span>{{ selectedMerchant?.address }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">营业执照号：</span>
          <span>{{ selectedMerchant?.businessLicense }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">银行账户：</span>
          <span>{{ selectedMerchant?.bankInfo }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">创建时间：</span>
          <span>{{ selectedMerchant?.createTime }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">最后修改：</span>
          <span>{{ selectedMerchant?.updateTime }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 状态变更确认对话框 -->
    <el-dialog v-model="showConfirmDialog" :title="confirmDialogTitle" width="400px">
      <p>{{ confirmDialogMessage }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showConfirmDialog = false">取消</el-button>
          <el-button :type="confirmDialogType" @click="confirmStatusChange">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'

// 商户信息接口
interface Merchant {
  id: string
  name: string
  type: string
  address: string
  phone: string
  legalPerson: string
  businessLicense: string
  bankInfo: string
  status: number // 1: 正常, 0: 已禁用
  createTime: string
  updateTime: string
}

// 搜索功能相关变量
const searchName = ref('')
const searchType = ref('')
const searchStatus = ref('')

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10)

// 弹窗相关变量
const showDetailDialog = ref(false)
const showConfirmDialog = ref(false)
const selectedMerchant = ref<Merchant | null>(null)
const statusToChange = ref(1)
const confirmDialogTitle = computed(() => (statusToChange.value === 1 ? '恢复商户' : '禁用商户'))
const confirmDialogMessage = computed(() => {
  return statusToChange.value === 1
    ? `确定要恢复商户 "${selectedMerchant.value?.name}" 吗？恢复后，该商户将可以正常经营。`
    : `确定要禁用商户 "${selectedMerchant.value?.name}" 吗？禁用后，该商户将无法继续经营。`
})
const confirmDialogType = computed(() => (statusToChange.value === 1 ? 'success' : 'danger'))

// 根据筛选条件过滤数据
const filteredData = computed(() => {
  let result = merchantData.value

  // 筛选商户名称
  if (searchName.value) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(searchName.value.toLowerCase()),
    )
  }

  // 筛选商户类型
  if (searchType.value) {
    result = result.filter((item) => item.type === searchType.value)
  }

  // 筛选商户状态
  if (searchStatus.value !== '') {
    result = result.filter((item) => item.status === searchStatus.value)
  }

  return result
})
// 总数据量
const totalItems = computed(() => filteredData.value.length)

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

// 筛选处理方法
const handleFilter = () => {
  currentPage.value = 1 // 重置到第一页
}

// 重置筛选条件
const handleReset = () => {
  searchName.value = ''
  searchType.value = ''
  searchStatus.value = ''
  currentPage.value = 1
}

// 分页处理方法
const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1 // 切换每页显示数量时重置到第一页
}

// 查看商户详情
const handleViewDetail = (row: Merchant) => {
  selectedMerchant.value = row
  showDetailDialog.value = true
}

// 处理商户状态变更
const handleStatusChange = (row: Merchant, status: number) => {
  selectedMerchant.value = row
  statusToChange.value = status
  showConfirmDialog.value = true
}

// 确认商户状态变更
const confirmStatusChange = () => {
  if (!selectedMerchant.value) return

  try {
    // 找到要更新的商户索引
    // 这里使用 merchantData.value 而不是 merchantData
    const index = merchantData.value.findIndex((m) => m.id === selectedMerchant.value?.id)

    if (index > -1) {
      // 创建一个新的商户对象，以确保响应式更新
      // 这里使用 merchantData.value[index] 而不是 merchantData[index]
      const updatedMerchant = {
        ...merchantData.value[index],
        status: statusToChange.value,
        updateTime: new Date().toLocaleString(),
      }

      // 替换原数组中的对象
      // 这里使用 merchantData.value.splice 而不是 merchantData.splice
      merchantData.value.splice(index, 1, updatedMerchant)

      // 显示成功消息
      ElMessage.success(
        statusToChange.value === 1
          ? `商户 ${selectedMerchant.value.name} 已成功恢复`
          : `商户 ${selectedMerchant.value.name} 已成功禁用`,
      )

      // 关闭对话框
      showConfirmDialog.value = false

      // 如果当前查看的是这个商户的详情，也更新详情中的数据
      if (showDetailDialog.value && selectedMerchant.value.id === updatedMerchant.id) {
        selectedMerchant.value = updatedMerchant
      }
    } else {
      ElMessage.error('未找到对应商户信息')
    }
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  }
}

// Mock数据 - 商户列表
const merchantData = ref([
  {
    id: 'M10001',
    name: '北京优品食品有限公司',
    type: '企业商户',
    address: '北京市朝阳区望京SOHO T1 2501',
    phone: '13812345678',
    legalPerson: '张三',
    businessLicense: '91110105MA01AB2X3Y',
    bankInfo: '建设银行 6217001234567890',
    status: 1,
    createTime: '2025-03-15 09:30:21',
    updateTime: '2025-03-15 09:30:21',
  },
  {
    id: 'M10002',
    name: '上海星宸贸易有限公司',
    type: '企业商户',
    address: '上海市浦东新区陆家嘴环路1233号',
    phone: '13987654321',
    legalPerson: '李四',
    businessLicense: '91310115MA01CD3E4Z',
    bankInfo: '工商银行 6222021234567890',
    status: 1,
    createTime: '2025-04-20 14:15:36',
    updateTime: '2025-04-20 14:15:36',
  },
  {
    id: 'M10003',
    name: '广州市绿源生鲜店',
    type: '个体商户',
    address: '广州市天河区天河路385号',
    phone: '15812345678',
    legalPerson: '王五',
    businessLicense: '92440101MA01EF4G5H',
    bankInfo: '农业银行 6228481234567890',
    status: 0,
    createTime: '2025-05-10 11:22:45',
    updateTime: '2025-10-12 16:33:42',
  },
  {
    id: 'M10004',
    name: '深圳市科技数码专营店',
    type: '个体商户',
    address: '深圳市南山区科技园南区T2栋101',
    phone: '13612345678',
    legalPerson: '赵六',
    businessLicense: '92440300MA01GH5I6J',
    bankInfo: '招商银行 6225881234567890',
    status: 1,
    createTime: '2025-06-01 08:45:12',
    updateTime: '2025-06-01 08:45:12',
  },
  {
    id: 'M10005',
    name: '成都川味小吃有限公司',
    type: '企业商户',
    address: '成都市锦江区红星路三段99号',
    phone: '18712345678',
    legalPerson: '孙七',
    businessLicense: '91510104MA01IJ6K7L',
    bankInfo: '中国银行 6216621234567890',
    status: 1,
    createTime: '2025-06-15 10:18:23',
    updateTime: '2025-06-15 10:18:23',
  },
  {
    id: 'M10006',
    name: '杭州丝绸服饰专卖店',
    type: '个体商户',
    address: '杭州市西湖区文三路478号',
    phone: '15987654321',
    legalPerson: '钱八',
    businessLicense: '92330106MA01KL7M8N',
    bankInfo: '浙商银行 6217001987654321',
    status: 0,
    createTime: '2025-07-05 16:24:51',
    updateTime: '2025-09-18 09:12:35',
  },
  {
    id: 'M10007',
    name: '武汉江城美食广场',
    type: '企业商户',
    address: '武汉市江汉区解放大道688号',
    phone: '13698765432',
    legalPerson: '周九',
    businessLicense: '91420103MA01MN8O9P',
    bankInfo: '交通银行 6222620123456789',
    status: 1,
    createTime: '2025-07-20 11:30:42',
    updateTime: '2025-07-20 11:30:42',
  },
  {
    id: 'M10008',
    name: '西安古都文创旗舰店',
    type: '个人商户',
    address: '西安市碑林区南大街120号',
    phone: '17612345678',
    legalPerson: '吴十',
    businessLicense: '92610103MA01PQ1R2S',
    bankInfo: '西安银行 6217002345678901',
    status: 1,
    createTime: '2025-08-03 09:45:18',
    updateTime: '2025-08-03 09:45:18',
  },
  {
    id: 'M10009',
    name: '重庆火锅食材批发中心',
    type: '企业商户',
    address: '重庆市渝中区解放碑步行街45号',
    phone: '13512345678',
    legalPerson: '郑十一',
    businessLicense: '91500103MA01ST3U4V',
    bankInfo: '重庆银行 6228483456789012',
    status: 0,
    createTime: '2025-08-15 14:20:36',
    updateTime: '2025-10-05 18:23:41',
  },
  {
    id: 'M10010',
    name: '南京雨花石艺术品店',
    type: '个人商户',
    address: '南京市雨花台区雨花路123号',
    phone: '18912345678',
    legalPerson: '王十二',
    businessLicense: '92320114MA01VW5X6Y',
    bankInfo: '南京银行 6217003456789012',
    status: 1,
    createTime: '2025-08-28 10:15:22',
    updateTime: '2025-08-28 10:15:22',
  },
  {
    id: 'M10011',
    name: '青岛海鲜生活馆',
    type: '个体商户',
    address: '青岛市市南区香港中路76号',
    phone: '15312345678',
    legalPerson: '李十三',
    businessLicense: '92370202MA01YZ7A8B',
    bankInfo: '青岛银行 6222024567890123',
    status: 1,
    createTime: '2025-09-10 08:40:15',
    updateTime: '2025-09-10 08:40:15',
  },
])
</script>
