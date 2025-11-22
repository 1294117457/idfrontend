<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center">
        <h4 class="text-[20px] font-bold text-gray-800">服务商审核</h4>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="审核开户服务商" name="upcoming" />
        <el-tab-pane label="审核服务商变更" name="history" />
      </el-tabs>
      <!-- 搜索区域 -->
      <el-row justify="space-between" align="bottom" class="filter mb-4">
        <el-row align="bottom" :gutter="20" style="width: 85%">
          <el-col :span="5">
            <label class="text-sm">服务商名称</label>
            <el-input v-model="searchName" placeholder="搜索服务商名称" clearable />
          </el-col>
          <el-col :span="5">
            <label class="text-sm mb-1">服务类型</label>
            <el-select
              v-model="searchServiceType"
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
          <el-col :span="5">
            <label class="text-sm mb-1">联系电话</label>
            <el-input v-model="searchPhone" placeholder="搜索联系电话" clearable />
          </el-col>
          <el-col :span="5">
            <label class="text-sm mb-1">申请人</label>
            <el-input v-model="searchCreator" placeholder="搜索申请人" clearable />
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
              {{ $index + 1 }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="服务商名称" width="120" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.name">{{ row.name }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.name }}</div>
              <div class="font-bold text-red-500">→ {{ row.name }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="address" label="服务商地址" min-width="150" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.address">{{ row.address }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.address }}</div>
              <div class="font-bold text-red-500">→ {{ row.address }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="联系电话" width="120" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.phone">{{ row.phone }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.phone }}</div>
              <div class="font-bold text-red-500">→ {{ row.phone }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="serviceType" label="服务类型" width="100" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.serviceType">{{ row.serviceType }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.serviceType }}</div>
              <div class="font-bold text-red-500">→ {{ row.serviceType }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="businessType" label="主体类型" width="100" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.businessType">{{ row.businessType }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.businessType }}</div>
              <div class="font-bold text-red-500">→ {{ row.businessType }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="businessLicense" label="营业执照" width="160" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.businessLicense">{{
              row.businessLicense
            }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.businessLicense }}</div>
              <div class="font-bold text-red-500">→ {{ row.businessLicense }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewDetail(row)">处理</el-button>
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
          :page-sizes="[5, 10, 15, 20, 25, 30]"
          :total="totalItems"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </el-row>
    </el-card>
    <el-dialog v-model="showDialog" title="审核服务商" width="500px" :close-on-click-modal="false">
      <div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">服务商名称：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.name">
            <span class="line-through text-gray-500">{{ selectedService.__oldValues.name }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.name }}</span>
          </template>
          <template v-else>{{ selectedService?.name }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">服务商地址：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.address">
            <span class="line-through text-gray-500">{{
              selectedService.__oldValues.address
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.address }}</span>
          </template>
          <template v-else>{{ selectedService?.address }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">联系电话：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.phone">
            <span class="line-through text-gray-500">{{ selectedService.__oldValues.phone }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.phone }}</span>
          </template>
          <template v-else>{{ selectedService?.phone }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">服务类型：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.serviceType">
            <span class="line-through text-gray-500">{{
              selectedService.__oldValues.serviceType
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.serviceType }}</span>
          </template>
          <template v-else>{{ selectedService?.serviceType }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">主体类型：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.businessType">
            <span class="line-through text-gray-500">{{
              selectedService.__oldValues.businessType
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.businessType }}</span>
          </template>
          <template v-else>{{ selectedService?.businessType }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">营业执照：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.businessLicense">
            <span class="line-through text-gray-500">{{
              selectedService.__oldValues.businessLicense
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.businessLicense }}</span>
          </template>
          <template v-else>{{ selectedService?.businessLicense }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">服务覆盖区域：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.serviceArea">
            <span class="line-through text-gray-500">{{
              selectedService.__oldValues.serviceArea
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.serviceArea }}</span>
          </template>
          <template v-else>{{ selectedService?.serviceArea }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">申请人：</span>
          <template v-if="selectedService?.__isChanged && selectedService?.__changed?.creator">
            <span class="line-through text-gray-500">{{
              selectedService.__oldValues.creator
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedService?.creator }}</span>
          </template>
          <template v-else>{{ selectedService?.creator }}</template>
        </div>
        <div class="mt-4">
          <label class="text-sm font-semibold">审核意见：</label>
          <el-input
            v-model="auditComment"
            type="textarea"
            placeholder="请输入审核意见"
            :rows="3"
            class="mt-2"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showDialog = false">取消</el-button>
          <el-button type="danger" @click="handleReject">拒绝</el-button>
          <el-button type="primary" @click="handleApprove">同意</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 服务商审核详情接口
interface ServiceProviderAuditDetail {
  serviceId: string
  name: string
  address: string
  phone: string
  serviceType: string
  businessType: string
  businessLicense: string
  serviceArea: string
  creator: string
}

// 分页和搜索
// 搜索功能相关变量
const searchName = ref('')
const searchPhone = ref('')
const searchServiceType = ref('')
const searchCreator = ref('')

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = computed(() => filteredData.value.length)

// 标签页切换
const activeTab = ref('upcoming') // 默认新增服务商

// 根据筛选条件过滤数据
const filteredData = computed(() => {
  let result = activeTab.value === 'upcoming' ? serviceAuditDetails : processedData.value

  // 筛选服务商名称
  if (searchName.value) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(searchName.value.toLowerCase()),
    )
  }

  // 筛选联系电话
  if (searchPhone.value) {
    result = result.filter((item) => item.phone.includes(searchPhone.value))
  }

  // 筛选服务类型
  if (searchServiceType.value) {
    result = result.filter((item) => item.serviceType === searchServiceType.value)
  }

  // 筛选申请人
  if (searchCreator.value) {
    result = result.filter((item) =>
      item.creator.toLowerCase().includes(searchCreator.value.toLowerCase()),
    )
  }

  return result
})

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
  searchPhone.value = ''
  searchServiceType.value = ''
  searchCreator.value = ''
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

// 变更审核内容处理
const processedData = computed(() => {
  if (activeTab.value === 'upcoming') {
    // 新增服务商数据不变
    return serviceAuditDetails
  } else {
    // 变更服务商数据合并为单行，记录变更信息
    return serviceChangeData.map(([oldData, newData]) => {
      // 创建变更标记对象
      const changedFields: Record<string, boolean> = {}
      const oldValues: Record<string, any> = {}

      Object.keys(oldData).forEach((key) => {
        // 比较旧数据和新数据
        const k = key as keyof ServiceProviderAuditDetail
        if (oldData[k] !== newData[k]) {
          changedFields[key] = true
          oldValues[key] = oldData[k]
        }
      })

      // 返回合并数据（单行），保留新数据为主体，同时记录变更信息
      return {
        ...newData,
        __changed: changedFields, // 记录哪些字段变更
        __oldValues: oldValues, // 记录变更前的旧值
        __isChanged: true, // 标记为变更服务商
      }
    })
  }
})

// 审核弹窗相关
const showDialog = ref(false)
const selectedService = ref<any>(null)
const auditComment = ref('')

// 处理查看详情
const handleViewDetail = (row: any) => {
  selectedService.value = row
  auditComment.value = ''
  showDialog.value = true
}

// 审核处理
const handleApprove = () => {
  if (!auditComment.value.trim()) {
    ElMessage.warning('请输入审核意见')
    return
  }
  // 实现同意逻辑，例如调用API
  console.log('同意审核', selectedService.value, auditComment.value)
  ElMessage.success('审核通过')
  showDialog.value = false
}

const handleReject = () => {
  if (!auditComment.value.trim()) {
    ElMessage.warning('请输入审核意见')
    return
  }
  // 实现拒绝逻辑，例如调用API
  console.log('拒绝审核', selectedService.value, auditComment.value)
  ElMessage.success('审核拒绝')
  showDialog.value = false
}

// mock数据 - 新增服务商
const serviceAuditDetails: ServiceProviderAuditDetail[] = [
  {
    serviceId: '2001',
    name: '京东物流服务中心',
    address: '北京市朝阳区大望路金地中心A座12层',
    phone: '13901234567',
    serviceType: '物流配送',
    businessType: '企业',
    businessLicense: '91110105MA01ABCDEF',
    serviceArea: '华北地区',
    creator: '李经理'
  },
  {
    serviceId: '2002',
    name: '全国电器售后服务有限公司',
    address: '上海市徐汇区虹桥路1号港汇广场3期12楼',
    phone: '13812345678',
    serviceType: '售后维修',
    businessType: '企业',
    businessLicense: '91310115MA02GHIJKL',
    serviceArea: '全国范围',
    creator: '张经理'
  },
  {
    serviceId: '2003',
    name: '中储智运仓储管理中心',
    address: '广州市天河区珠江新城冼村路21号',
    phone: '15812345678',
    serviceType: '仓储服务',
    businessType: '企业',
    businessLicense: '92440101MA03MNOPQR',
    serviceArea: '华南地区',
    creator: '王经理'
  },
  {
    serviceId: '2004',
    name: '云客服呼叫中心',
    address: '深圳市南山区科技园南区T2栋5楼',
    phone: '13687654321',
    serviceType: '客户服务',
    businessType: '个体',
    businessLicense: '92440300MA04STUVWX',
    serviceArea: '线上全国',
    creator: '陈经理'
  },
  {
    serviceId: '2005',
    name: '智慧科技运维服务公司',
    address: '成都市高新区天府软件园B区10栋',
    phone: '18912345678',
    serviceType: '技术支持',
    businessType: '企业',
    businessLicense: '91510104MA05YZABCD',
    serviceArea: '西南地区',
    creator: '赵经理'
  },
]

// mock数据 - 服务商变更
const serviceChangeData: ServiceProviderAuditDetail[][] = [
  [
    // 旧数据
    {
      serviceId: '2001',
      name: '京东物流服务中心',
      address: '北京市朝阳区大望路金地中心A座12层',
      phone: '13901234567',
      serviceType: '物流配送',
      businessType: '企业',
      businessLicense: '91110105MA01ABCDEF',
      serviceArea: '华北地区',
      creator: '李经理'
    },
    // 新数据（变更地址和服务区域）
    {
      serviceId: '2001',
      name: '京东物流服务中心',
      address: '北京市海淀区西二旗智学苑5号楼',
      phone: '13901234567',
      serviceType: '物流配送',
      businessType: '企业',
      businessLicense: '91110105MA01ABCDEF',
      serviceArea: '华北、华东地区',
      creator: '李经理'
    }
  ],
  [
    // 旧数据
    {
      serviceId: '2002',
      name: '全国电器售后服务有限公司',
      address: '上海市徐汇区虹桥路1号港汇广场3期12楼',
      phone: '13812345678',
      serviceType: '售后维修',
      businessType: '企业',
      businessLicense: '91310115MA02GHIJKL',
      serviceArea: '全国范围',
      creator: '张经理'
    },
    // 新数据（变更电话和业务类型）
    {
      serviceId: '2002',
      name: '全国电器售后服务有限公司',
      address: '上海市徐汇区虹桥路1号港汇广场3期12楼',
      phone: '13888888888',
      serviceType: '售后维修',
      businessType: '上市公司',
      businessLicense: '91310115MA02GHIJKL',
      serviceArea: '全国范围',
      creator: '张经理'
    }
  ],
  [
    // 旧数据
    {
      serviceId: '2003',
      name: '中储智运仓储管理中心',
      address: '广州市天河区珠江新城冼村路21号',
      phone: '15812345678',
      serviceType: '仓储服务',
      businessType: '企业',
      businessLicense: '92440101MA03MNOPQR',
      serviceArea: '华南地区',
      creator: '王经理'
    },
    // 新数据（变更名称和服务类型）
    {
      serviceId: '2003',
      name: '中储智运综合物流服务中心',
      address: '广州市天河区珠江新城冼村路21号',
      phone: '15812345678',
      serviceType: '仓储服务,物流配送',
      businessType: '企业',
      businessLicense: '92440101MA03MNOPQR',
      serviceArea: '华南地区',
      creator: '王经理'
    }
  ],
  [
    // 旧数据
    {
      serviceId: '2004',
      name: '云客服呼叫中心',
      address: '深圳市南山区科技园南区T2栋5楼',
      phone: '13687654321',
      serviceType: '客户服务',
      businessType: '个体',
      businessLicense: '92440300MA04STUVWX',
      serviceArea: '线上全国',
      creator: '陈经理'
    },
    // 新数据（变更营业执照）
    {
      serviceId: '2004',
      name: '云客服呼叫中心',
      address: '深圳市南山区科技园南区T2栋5楼',
      phone: '13687654321',
      serviceType: '客户服务',
      businessType: '个体',
      businessLicense: '92440300MA06EFGHIJ',
      serviceArea: '线上全国',
      creator: '陈经理'
    }
  ],
  [
    // 旧数据
    {
      serviceId: '2005',
      name: '智慧科技运维服务公司',
      address: '成都市高新区天府软件园B区10栋',
      phone: '18912345678',
      serviceType: '技术支持',
      businessType: '企业',
      businessLicense: '91510104MA05YZABCD',
      serviceArea: '西南地区',
      creator: '赵经理'
    },
    // 新数据（变更多项）
    {
      serviceId: '2005',
      name: '智慧科技综合IT运维公司',
      address: '成都市高新区天府五街200号',
      phone: '18912345678',
      serviceType: '技术支持,售后维修',
      businessType: '企业',
      businessLicense: '91510104MA05YZABCD',
      serviceArea: '全国范围',
      creator: '赵经理'
    }
  ]
]
</script>