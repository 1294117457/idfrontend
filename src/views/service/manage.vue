<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center">
        <h4 class="text-[20px] font-bold text-gray-800">服务商管理</h4>
      </div>

      <!-- 搜索区域 -->
      <el-row justify="space-between" align="bottom" class="filter mb-4">
        <el-row align="bottom" :gutter="20" style="width: 85%">
          <el-col :span="6">
            <label class="text-sm">服务商名称</label>
            <el-input v-model="searchName" placeholder="搜索服务商名称" clearable />
          </el-col>
          <el-col :span="6">
            <label class="text-sm mb-1">服务类型</label>
            <el-select
              v-model="searchType"
              placeholder="选择服务类型"
              clearable
              style="width: 100%"
            >
              <el-option value="物流配送" label="物流配送" />
              <el-option value="售后维修" label="售后维修" />
              <el-option value="仓储服务" label="仓储服务" />
              <el-option value="客户服务" label="客户服务" />
              <el-option value="技术支持" label="技术支持" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <label class="text-sm mb-1">服务商状态</label>
            <el-select
              v-model="searchStatus"
              placeholder="选择服务商状态"
              clearable
              style="width: 100%"
            >
              <el-option :value="1" label="正常" />
              <el-option :value="0" label="已暂停" />
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

        <el-table-column prop="id" label="服务商ID" width="80" align="center" />
        <el-table-column prop="name" label="服务商名称" width="150" align="center" />
        <el-table-column prop="serviceType" label="服务类型" width="100" align="center" />
        <el-table-column prop="address" label="服务商地址" min-width="180" align="center" />
        <el-table-column prop="phone" label="联系电话" width="120" align="center" />
        <el-table-column prop="businessType" label="主体类型" width="100" align="center" />

        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '已暂停' }}
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
              暂停
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

    <!-- 服务商详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="服务商详情" width="600px">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">服务商ID：</span>
          <span>{{ selectedServiceProvider?.id }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">服务商名称：</span>
          <span>{{ selectedServiceProvider?.name }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">服务类型：</span>
          <span>{{ selectedServiceProvider?.serviceType }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">服务商状态：</span>
          <el-tag :type="selectedServiceProvider?.status === 1 ? 'success' : 'danger'" size="small">
            {{ selectedServiceProvider?.status === 1 ? '正常' : '已暂停' }}
          </el-tag>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">联系电话：</span>
          <span>{{ selectedServiceProvider?.phone }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">主体类型：</span>
          <span>{{ selectedServiceProvider?.businessType }}</span>
        </div>
        <div class="text-[14px] text-gray-700 col-span-2">
          <span class="font-semibold">服务商地址：</span>
          <span>{{ selectedServiceProvider?.address }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">营业执照号：</span>
          <span>{{ selectedServiceProvider?.businessLicense }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">服务覆盖区域：</span>
          <span>{{ selectedServiceProvider?.serviceArea }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">创建时间：</span>
          <span>{{ selectedServiceProvider?.createTime }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">最后修改：</span>
          <span>{{ selectedServiceProvider?.updateTime }}</span>
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
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

// 服务商信息接口
interface ServiceProvider {
  id: string
  name: string
  serviceType: string
  address: string
  phone: string
  businessType: string
  businessLicense: string
  serviceArea: string
  status: number // 1: 正常, 0: 已暂停
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
const selectedServiceProvider = ref<ServiceProvider | null>(null)
const statusToChange = ref(1)
const confirmDialogTitle = computed(() =>
  statusToChange.value === 1 ? '恢复服务商' : '暂停服务商',
)
const confirmDialogMessage = computed(() => {
  return statusToChange.value === 1
    ? `确定要恢复服务商 "${selectedServiceProvider.value?.name}" 吗？恢复后，该服务商将可以正常提供服务。`
    : `确定要暂停服务商 "${selectedServiceProvider.value?.name}" 吗？暂停后，该服务商将无法继续提供服务。`
})
const confirmDialogType = computed(() => (statusToChange.value === 1 ? 'success' : 'danger'))

// 根据筛选条件过滤数据
const filteredData = computed(() => {
  let result = serviceProviderData.value

  // 筛选服务商名称
  if (searchName.value) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(searchName.value.toLowerCase()),
    )
  }

  // 筛选服务类型
  if (searchType.value) {
    result = result.filter((item) => item.serviceType === searchType.value)
  }

  // 筛选服务商状态
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

// 查看服务商详情
const handleViewDetail = (row: ServiceProvider) => {
  selectedServiceProvider.value = row
  showDetailDialog.value = true
}

// 处理服务商状态变更
const handleStatusChange = (row: ServiceProvider, status: number) => {
  selectedServiceProvider.value = row
  statusToChange.value = status
  showConfirmDialog.value = true
}

// 确认服务商状态变更
const confirmStatusChange = () => {
  if (!selectedServiceProvider.value) return

  try {
    // 找到要更新的服务商索引
    const index = serviceProviderData.value.findIndex(
      (m) => m.id === selectedServiceProvider.value?.id,
    )

    if (index > -1) {
      // 创建一个新的服务商对象，以确保响应式更新
      const updatedServiceProvider = {
        ...serviceProviderData.value[index],
        status: statusToChange.value,
        updateTime: new Date().toLocaleString(),
      }

      // 替换原数组中的对象
      serviceProviderData.value.splice(index, 1, updatedServiceProvider)

      // 显示成功消息
      ElMessage.success(
        statusToChange.value === 1
          ? `服务商 ${selectedServiceProvider.value.name} 已成功恢复`
          : `服务商 ${selectedServiceProvider.value.name} 已成功暂停`,
      )

      // 关闭对话框
      showConfirmDialog.value = false

      // 如果当前查看的是这个服务商的详情，也更新详情中的数据
      if (
        showDetailDialog.value &&
        selectedServiceProvider.value.id === updatedServiceProvider.id
      ) {
        selectedServiceProvider.value = updatedServiceProvider
      }
    } else {
      ElMessage.error('未找到对应服务商信息')
    }
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  }
}

// Mock数据 - 服务商列表
const serviceProviderData = ref<ServiceProvider[]>([
  {
    id: 'S10001',
    name: '京东物流服务中心',
    serviceType: '物流配送',
    address: '北京市朝阳区大望路金地中心A座12层',
    phone: '13901234567',
    businessType: '企业',
    businessLicense: '91110105MA01ABCDEF',
    serviceArea: '华北地区',
    status: 1,
    createTime: '2025-03-15 09:30:21',
    updateTime: '2025-03-15 09:30:21',
  },
  {
    id: 'S10002',
    name: '全国电器售后服务有限公司',
    serviceType: '售后维修',
    address: '上海市徐汇区虹桥路1号港汇广场3期12楼',
    phone: '13812345678',
    businessType: '企业',
    businessLicense: '91310115MA02GHIJKL',
    serviceArea: '全国范围',
    status: 1,
    createTime: '2025-04-20 14:15:36',
    updateTime: '2025-04-20 14:15:36',
  },
  {
    id: 'S10003',
    name: '中储智运仓储管理中心',
    serviceType: '仓储服务',
    address: '广州市天河区珠江新城冼村路21号',
    phone: '15812345678',
    businessType: '企业',
    businessLicense: '92440101MA03MNOPQR',
    serviceArea: '华南地区',
    status: 0,
    createTime: '2025-05-10 11:22:45',
    updateTime: '2025-10-12 16:33:42',
  },
  {
    id: 'S10004',
    name: '云客服呼叫中心',
    serviceType: '客户服务',
    address: '深圳市南山区科技园南区T2栋5楼',
    phone: '13687654321',
    businessType: '个体',
    businessLicense: '92440300MA04STUVWX',
    serviceArea: '线上全国',
    status: 1,
    createTime: '2025-06-01 08:45:12',
    updateTime: '2025-06-01 08:45:12',
  },
  {
    id: 'S10005',
    name: '智慧科技运维服务公司',
    serviceType: '技术支持',
    address: '成都市高新区天府软件园B区10栋',
    phone: '18912345678',
    businessType: '企业',
    businessLicense: '91510104MA05YZABCD',
    serviceArea: '西南地区',
    status: 1,
    createTime: '2025-06-15 10:18:23',
    updateTime: '2025-06-15 10:18:23',
  },
  {
    id: 'S10006',
    name: '顺丰速运服务中心',
    serviceType: '物流配送',
    address: '杭州市西湖区文三路478号',
    phone: '15987654321',
    businessType: '企业',
    businessLicense: '92330106MA06KLMNOP',
    serviceArea: '华东地区',
    status: 0,
    createTime: '2025-07-05 16:24:51',
    updateTime: '2025-09-18 09:12:35',
  },
  {
    id: 'S10007',
    name: '京东到家配送服务',
    serviceType: '物流配送',
    address: '武汉市江汉区解放大道688号',
    phone: '13698765432',
    businessType: '企业',
    businessLicense: '91420103MA07QRSTUV',
    serviceArea: '华中地区',
    status: 1,
    createTime: '2025-07-20 11:30:42',
    updateTime: '2025-07-20 11:30:42',
  },
  {
    id: 'S10008',
    name: '西安线下体验店维修中心',
    serviceType: '售后维修',
    address: '西安市碑林区南大街120号',
    phone: '17612345678',
    businessType: '个体',
    businessLicense: '92610103MA08WXYZAB',
    serviceArea: '西北地区',
    status: 1,
    createTime: '2025-08-03 09:45:18',
    updateTime: '2025-08-03 09:45:18',
  },
  {
    id: 'S10009',
    name: '重庆市南岸区仓配中心',
    serviceType: '仓储服务',
    address: '重庆市渝中区解放碑步行街45号',
    phone: '13512345678',
    businessType: '企业',
    businessLicense: '91500103MA09CDEFGH',
    serviceArea: '西南地区',
    status: 0,
    createTime: '2025-08-15 14:20:36',
    updateTime: '2025-10-05 18:23:41',
  },
  {
    id: 'S10010',
    name: '南京IT技术支持中心',
    serviceType: '技术支持',
    address: '南京市雨花台区雨花路123号',
    phone: '18912345678',
    businessType: '个体',
    businessLicense: '92320114MA10IJKLMN',
    serviceArea: '华东地区',
    status: 1,
    createTime: '2025-08-28 10:15:22',
    updateTime: '2025-08-28 10:15:22',
  },
  {
    id: 'S10011',
    name: '青岛客户服务中心',
    serviceType: '客户服务',
    address: '青岛市市南区香港中路76号',
    phone: '15312345678',
    businessType: '企业',
    businessLicense: '92370202MA11OPQRST',
    serviceArea: '华东地区',
    status: 1,
    createTime: '2025-09-10 08:40:15',
    updateTime: '2025-09-10 08:40:15',
  },
])
</script>
