<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center">
        <h4 class="text-[20px] font-bold text-gray-800">活动审核</h4>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="审核活动申请" name="upcoming" />
        <el-tab-pane label="查询活动记录" name="history" />
      </el-tabs>
      <!-- 搜索区域 -->
      <el-row justify="space-between" align="bottom" class="filter mb-4">
        <el-row align="bottom" :gutter="20" style="width: 85%">
          <el-col :span="5">
            <label class="text-sm">活动名称</label>
            <el-input v-model="searchName" placeholder="搜索活动名称" clearable />
          </el-col>
          <el-col :span="5">
            <label class="text-sm mb-1">活动类型</label>
            <el-select
              v-model="searchType"
              placeholder="选择活动类型"
              clearable
              style="width: 100%"
            >
              <el-option value="直接打折" label="直接打折" />
              <el-option value="红包" label="红包" />
              <el-option value="满减" label="满减" />
              <el-option value="赠品" label="赠品" />
            </el-select>
          </el-col>
          <el-col :span="5">
            <label class="text-sm mb-1">商户名称</label>
            <el-input v-model="searchMerchant" placeholder="搜索商户名称" clearable />
          </el-col>
          <el-col :span="5">
            <label class="text-sm mb-1">状态</label>
            <el-select v-model="searchStatus" placeholder="选择状态" clearable style="width: 100%">
              <el-option value="待审核" label="待审核" />
              <el-option value="已通过" label="已通过" />
              <el-option value="已拒绝" label="已拒绝" />
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

        <el-table-column prop="activityName" label="活动名称" width="150" align="center" />
        <el-table-column prop="productName" label="商品名称" width="150" align="center" />

        <el-table-column label="活动时间" width="200" align="center">
          <template #default="{ row }">
            <div>{{ row.startTime }}</div>
            <div>至</div>
            <div>{{ row.endTime }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="discountType" label="打折方式" width="100" align="center" />

        <el-table-column label="价格信息" width="150" align="center">
          <template #default="{ row }">
            <div>
              <span class="line-through text-gray-500">原价: ¥{{ row.originalPrice }}</span>
            </div>
            <div>
              <span class="font-bold text-red-500">活动价: ¥{{ row.discountPrice }}</span>
            </div>
            <div class="text-xs text-green-600">
              折扣: {{ ((row.discountPrice / row.originalPrice) * 10).toFixed(1) }}折
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="merchantName" label="商户名称" width="150" align="center" />

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="applyTime" label="申请时间" width="150" align="center" />

        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === '待审核'"
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              处理
            </el-button>
            <el-button v-else type="info" size="small" @click="handleViewDetail(row)">
              查看
            </el-button>
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

    <!-- 活动审核弹窗 -->
    <el-dialog v-model="showDialog" title="活动审核" width="600px" :close-on-click-modal="false">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">活动名称：</span>
          <span>{{ selectedActivity?.activityName }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">活动类型：</span>
          <span>{{ selectedActivity?.discountType }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商品名称：</span>
          <span>{{ selectedActivity?.productName }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商品分类：</span>
          <span>{{ selectedActivity?.productCategory }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">开始时间：</span>
          <span>{{ selectedActivity?.startTime }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">结束时间：</span>
          <span>{{ selectedActivity?.endTime }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商品原价：</span>
          <span class="line-through text-gray-500">¥{{ selectedActivity?.originalPrice }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">活动价格：</span>
          <span class="font-bold text-red-500">¥{{ selectedActivity?.discountPrice }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">折扣比例：</span>
          <span class="text-green-600">{{
            selectedActivity
              ? ((selectedActivity.discountPrice / selectedActivity.originalPrice) * 10).toFixed(
                  1,
                ) + '折'
              : ''
          }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">商户名称：</span>
          <span>{{ selectedActivity?.merchantName }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">活动说明：</span>
          <span>{{ selectedActivity?.description }}</span>
        </div>
        <div class="text-[14px] text-gray-700">
          <span class="font-semibold">申请时间：</span>
          <span>{{ selectedActivity?.applyTime }}</span>
        </div>
      </div>

      <div v-if="selectedActivity?.status === '待审核'" class="mt-4">
        <label class="text-sm font-semibold">审核意见：</label>
        <el-input
          v-model="auditComment"
          type="textarea"
          placeholder="请输入审核意见"
          :rows="3"
          class="mt-2"
        />
      </div>

      <div v-else class="mt-4">
        <label class="text-sm font-semibold">审核结果：</label>
        <div class="mt-2 p-2 bg-gray-50 rounded">
          <div>
            <span class="font-semibold">状态：</span>
            <el-tag :type="getStatusType(selectedActivity?.status)">
              {{ selectedActivity?.status }}
            </el-tag>
          </div>
          <div class="mt-2">
            <span class="font-semibold">审核意见：</span>
            <span>{{ selectedActivity?.auditComment }}</span>
          </div>
          <div class="mt-1">
            <span class="font-semibold">审核时间：</span>
            <span>{{ selectedActivity?.auditTime }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showDialog = false">关闭</el-button>
          <template v-if="selectedActivity?.status === '待审核'">
            <el-button type="danger" @click="handleReject">拒绝</el-button>
            <el-button type="primary" @click="handleApprove">同意</el-button>
          </template>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

// 活动审核详情接口
interface ActivityAuditDetail {
  id: string
  activityName: string
  productName: string
  productCategory: string
  startTime: string
  endTime: string
  discountType: string
  originalPrice: number
  discountPrice: number
  merchantName: string
  merchantId: string
  description: string
  status: string
  applyTime: string
  auditTime?: string
  auditComment?: string
}

// 搜索功能相关变量
const searchName = ref('')
const searchType = ref('')
const searchMerchant = ref('')
const searchStatus = ref('')

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = computed(() => filteredData.value.length)

// 标签页切换
const activeTab = ref('upcoming') // 默认展示待审核活动

// 根据筛选条件过滤数据
const filteredData = computed(() => {
  // 如果是待审核标签页，只显示待审核的数据
  let result =
    activeTab.value === 'upcoming'
      ? activityAuditData.filter((item) => item.status === '待审核')
      : activityAuditData.filter((item) => item.status !== '待审核')

  // 筛选活动名称
  if (searchName.value) {
    result = result.filter((item) =>
      item.activityName.toLowerCase().includes(searchName.value.toLowerCase()),
    )
  }

  // 筛选活动类型
  if (searchType.value) {
    result = result.filter((item) => item.discountType === searchType.value)
  }

  // 筛选商户名称
  if (searchMerchant.value) {
    result = result.filter((item) =>
      item.merchantName.toLowerCase().includes(searchMerchant.value.toLowerCase()),
    )
  }

  // 筛选状态
  if (searchStatus.value) {
    result = result.filter((item) => item.status === searchStatus.value)
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
  searchType.value = ''
  searchMerchant.value = ''
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

// 获取状态标签类型
const getStatusType = (status: string | undefined) => {
  if (!status) return ''
  switch (status) {
    case '待审核':
      return 'warning'
    case '已通过':
      return 'success'
    case '已拒绝':
      return 'danger'
    default:
      return 'info'
  }
}

// 审核弹窗相关
const showDialog = ref(false)
const selectedActivity = ref<ActivityAuditDetail | null>(null)
const auditComment = ref('')

// 处理查看详情
const handleViewDetail = (row: ActivityAuditDetail) => {
  selectedActivity.value = row
  auditComment.value = row.auditComment || ''
  showDialog.value = true
}

// 审核处理
const handleApprove = () => {
  if (!selectedActivity.value) return

  if (!auditComment.value.trim()) {
    ElMessage.warning('请输入审核意见')
    return
  }

  // 实现审核通过逻辑
  const index = activityAuditData.findIndex((item) => item.id === selectedActivity.value?.id)
  if (index > -1) {
    activityAuditData[index] = {
      ...activityAuditData[index],
      status: '已通过',
      auditComment: auditComment.value,
      auditTime: new Date().toLocaleString(),
    }

    ElMessage.success('活动审核已通过')
    showDialog.value = false
  }
}

const handleReject = () => {
  if (!selectedActivity.value) return

  if (!auditComment.value.trim()) {
    ElMessage.warning('请输入审核意见')
    return
  }

  // 实现审核拒绝逻辑
  const index = activityAuditData.findIndex((item) => item.id === selectedActivity.value?.id)
  if (index > -1) {
    activityAuditData[index] = {
      ...activityAuditData[index],
      status: '已拒绝',
      auditComment: auditComment.value,
      auditTime: new Date().toLocaleString(),
    }

    ElMessage.success('已拒绝该活动申请')
    showDialog.value = false
  }
}

// mock数据 - 活动审核数据
const activityAuditData: ActivityAuditDetail[] = [
  {
    id: '1001',
    activityName: '双十一大促',
    productName: 'iPhone 15 Pro Max',
    productCategory: '手机数码',
    startTime: '2025-11-01 00:00:00',
    endTime: '2025-11-15 23:59:59',
    discountType: '直接打折',
    originalPrice: 9999,
    discountPrice: 8999,
    merchantName: '北京优品数码旗舰店',
    merchantId: 'M10001',
    description: '双十一活动期间，全场数码产品直降1000元',
    status: '待审核',
    applyTime: '2025-10-15 10:23:45',
  },
  {
    id: '1002',
    activityName: '618年中大促',
    productName: 'MacBook Pro 16英寸',
    productCategory: '电脑办公',
    startTime: '2025-06-01 00:00:00',
    endTime: '2025-06-18 23:59:59',
    discountType: '满减',
    originalPrice: 18999,
    discountPrice: 16999,
    merchantName: '上海星宸电子旗舰店',
    merchantId: 'M10002',
    description: '618年中大促，满15000减2000',
    status: '待审核',
    applyTime: '2025-05-20 14:35:22',
  },
  {
    id: '1003',
    activityName: '新春特惠',
    productName: '华为Mate60 Pro',
    productCategory: '手机数码',
    startTime: '2025-02-01 00:00:00',
    endTime: '2025-02-15 23:59:59',
    discountType: '红包',
    originalPrice: 6999,
    discountPrice: 6499,
    merchantName: '深圳市科技数码专营店',
    merchantId: 'M10004',
    description: '新春特惠，购机即送500元红包',
    status: '待审核',
    applyTime: '2025-01-15 09:12:33',
  },
  {
    id: '1004',
    activityName: '开学季特惠',
    productName: '联想小新Pro 16',
    productCategory: '电脑办公',
    startTime: '2025-09-01 00:00:00',
    endTime: '2025-09-15 23:59:59',
    discountType: '赠品',
    originalPrice: 6599,
    discountPrice: 5999,
    merchantName: '广州市绿源数码店',
    merchantId: 'M10003',
    description: '开学季特惠，购机赠送无线鼠标+背包',
    status: '待审核',
    applyTime: '2025-08-15 16:45:12',
  },
  {
    id: '1005',
    activityName: '情人节专享',
    productName: 'Apple Watch Series 9',
    productCategory: '智能穿戴',
    startTime: '2025-02-10 00:00:00',
    endTime: '2025-02-14 23:59:59',
    discountType: '直接打折',
    originalPrice: 3999,
    discountPrice: 3599,
    merchantName: '成都川味电子商城',
    merchantId: 'M10005',
    description: '情人节专享折扣，限量优惠',
    status: '已通过',
    applyTime: '2025-01-25 11:23:45',
    auditTime: '2025-01-26 09:15:22',
    auditComment: '活动内容合规，价格合理，同意通过',
  },
  {
    id: '1006',
    activityName: '暑期大促',
    productName: 'iPad Pro 12.9英寸',
    productCategory: '平板电脑',
    startTime: '2025-07-01 00:00:00',
    endTime: '2025-08-31 23:59:59',
    discountType: '满减',
    originalPrice: 8999,
    discountPrice: 7999,
    merchantName: '北京优品数码旗舰店',
    merchantId: 'M10001',
    description: '暑期大促，满5000减1000',
    status: '已通过',
    applyTime: '2025-06-15 14:22:33',
    auditTime: '2025-06-16 10:05:18',
    auditComment: '活动符合平台规则，同意通过',
  },
  {
    id: '1007',
    activityName: '黑五特惠',
    productName: '索尼WH-1000XM5耳机',
    productCategory: '数码配件',
    startTime: '2025-11-25 00:00:00',
    endTime: '2025-11-30 23:59:59',
    discountType: '直接打折',
    originalPrice: 2999,
    discountPrice: 1999,
    merchantName: '上海星宸电子旗舰店',
    merchantId: 'M10002',
    description: '黑五特惠，全场音频设备低至7折',
    status: '已拒绝',
    applyTime: '2025-11-01 09:33:44',
    auditTime: '2025-11-02 11:25:16',
    auditComment: '折扣力度过大，低于平台规定的最低折扣标准，请调整后重新提交',
  },
  {
    id: '1008',
    activityName: '圣诞特惠',
    productName: 'Nintendo Switch OLED',
    productCategory: '游戏设备',
    startTime: '2025-12-20 00:00:00',
    endTime: '2025-12-26 23:59:59',
    discountType: '赠品',
    originalPrice: 2299,
    discountPrice: 2099,
    merchantName: '深圳市科技数码专营店',
    merchantId: 'M10004',
    description: '圣诞特惠，购机赠送精美游戏手柄',
    status: '待审核',
    applyTime: '2025-12-05 15:42:11',
  },
]
</script>
