<template>
  <div class="min-h-screen flex flex-col gap-5 p-4">
    <el-card>
      <div class="flex items-center">
        <h4 class="text-[20px] font-bold text-gray-800">商户审核</h4>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="审核新增商户" name="upcoming" />
        <el-tab-pane label="审核商户变更" name="history" />
      </el-tabs>
      <!-- 搜索区域 -->
      <el-row justify="space-between" align="bottom" class="filter mb-4">
        <el-row align="bottom" :gutter="20" style="width: 85%">
          <el-col :span="5">
            <label class="text-sm">商户名称</label>
            <el-input v-model="searchName" placeholder="搜索商户名称" clearable />
          </el-col>
          <el-col :span="5">
            <label class="text-sm mb-1">申请类别</label>
            <el-select
              v-model="searchApplyType"
              placeholder="选择申请类别"
              clearable
              style="width: 100%"
            >
              <el-option value="个体商户" label="个体商户" />
              <el-option value="企业商户" label="企业商户" />
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

        <el-table-column prop="name" label="商户名称" width="120" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.name">{{ row.name }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.name }}</div>
              <div class="font-bold text-red-500">→ {{ row.name }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="address" label="商户地址" min-width="150" align="center">
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
        <el-table-column prop="applyType" label="申请类别" width="100" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.applyType">{{ row.applyType }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.applyType }}</div>
              <div class="font-bold text-red-500">→ {{ row.applyType }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="legalPerson" label="法人名称" width="100" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.legalPerson">{{
              row.legalPerson
            }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.legalPerson }}</div>
              <div class="font-bold text-red-500">→ {{ row.legalPerson }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="businessLicense" label="主体资质证明" width="160" align="center">
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

        <el-table-column prop="bankInfo" label="银行信息" width="150" align="center">
          <template #default="{ row }">
            <span v-if="!row.__isChanged || !row.__changed?.bankInfo">{{ row.bankInfo }}</span>
            <div v-else class="text-xs">
              <div class="text-gray-500">{{ row.__oldValues.bankInfo }}</div>
              <div class="font-bold text-red-500">→ {{ row.bankInfo }}</div>
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
    <el-dialog v-model="showDialog" title="审核商户" width="500px" :close-on-click-modal="false">
      <div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">商户名称：</span>
          <template v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.name">
            <span class="line-through text-gray-500">{{ selectedMerchant.__oldValues.name }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.name }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.name }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">商户地址：</span>
          <template v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.address">
            <span class="line-through text-gray-500">{{
              selectedMerchant.__oldValues.address
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.address }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.address }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">联系电话：</span>
          <template v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.phone">
            <span class="line-through text-gray-500">{{ selectedMerchant.__oldValues.phone }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.phone }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.phone }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">申请类别：</span>
          <template v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.applyType">
            <span class="line-through text-gray-500">{{
              selectedMerchant.__oldValues.applyType
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.applyType }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.applyType }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">法人名称：</span>
          <template
            v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.legalPerson"
          >
            <span class="line-through text-gray-500">{{
              selectedMerchant.__oldValues.legalPerson
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.legalPerson }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.legalPerson }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">营业执照：</span>
          <template
            v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.businessLicense"
          >
            <span class="line-through text-gray-500">{{
              selectedMerchant.__oldValues.businessLicense
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.businessLicense }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.businessLicense }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">银行信息：</span>
          <template v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.bankInfo">
            <span class="line-through text-gray-500">{{
              selectedMerchant.__oldValues.bankInfo
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.bankInfo }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.bankInfo }}</template>
        </div>
        <div class="text-[14px] text-gray-700 mb-2">
          <span class="font-semibold">申请人：</span>
          <template v-if="selectedMerchant?.__isChanged && selectedMerchant?.__changed?.creator">
            <span class="line-through text-gray-500">{{
              selectedMerchant.__oldValues.creator
            }}</span>
            <span class="ml-2 text-red-500">{{ selectedMerchant?.creator }}</span>
          </template>
          <template v-else>{{ selectedMerchant?.creator }}</template>
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

// 商户审核详情接口
interface MerchantAuditDetail {
  merchantId: string
  name: string
  address: string
  phone: string
  applyType: string
  legalPerson: string
  businessLicense: string
  bankInfo: string
  creator: string
}

// 分页和搜索
// 搜索功能相关变量
const searchName = ref('')
const searchPhone = ref('')
const searchApplyType = ref('')
const searchCreator = ref('')

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = computed(() => filteredData.value.length)

// 标签页切换
const activeTab = ref('upcoming') // 默认新增商户

// 根据筛选条件过滤数据
const filteredData = computed(() => {
  let result = activeTab.value === 'upcoming' ? merchantAuditDetails : processedData.value

  // 筛选商户名称
  if (searchName.value) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(searchName.value.toLowerCase()),
    )
  }

  // 筛选联系电话
  if (searchPhone.value) {
    result = result.filter((item) => item.phone.includes(searchPhone.value))
  }

  // 筛选申请类别
  if (searchApplyType.value) {
    result = result.filter((item) => item.applyType === searchApplyType.value)
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
  searchApplyType.value = ''
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
    // 新增商户数据不变
    return merchantAuditDetails
  } else {
    // 变更商户数据合并为单行，记录变更信息
    return merchantChangeData.map(([oldData, newData]) => {
      // 创建变更标记对象
      const changedFields: Record<string, boolean> = {}
      const oldValues: Record<string, any> = {}

      Object.keys(oldData).forEach((key) => {
        // 比较旧数据和新数据
        const k = key as keyof MerchantAuditDetail
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
        __isChanged: true, // 标记为变更商户
      }
    })
  }
})

// 审核弹窗相关
const showDialog = ref(false)
const selectedMerchant = ref<any>(null)
const auditComment = ref('')

// 处理查看详情
const handleViewDetail = (row: any) => {
  selectedMerchant.value = row
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
  console.log('同意审核', selectedMerchant.value, auditComment.value)
  ElMessage.success('审核通过')
  showDialog.value = false
}

const handleReject = () => {
  if (!auditComment.value.trim()) {
    ElMessage.warning('请输入审核意见')
    return
  }
  // 实现拒绝逻辑，例如调用API
  console.log('拒绝审核', selectedMerchant.value, auditComment.value)
  ElMessage.success('审核拒绝')
  showDialog.value = false
}

// mock数据 - 新增商户
const merchantAuditDetails: MerchantAuditDetail[] = [
  {
    merchantId: '1001',
    name: '北京优品食品有限公司',
    address: '北京市朝阳区望京SOHO T1 2501',
    phone: '13812345678',
    applyType: '企业商户',
    legalPerson: '张三',
    businessLicense: '91110105MA01AB2X3Y',
    bankInfo: '建设银行 6217001234567890',
    creator: '刘运营',
  },
  {
    merchantId: '1002',
    name: '上海星宸贸易有限公司',
    address: '上海市浦东新区陆家嘴环路1233号',
    phone: '13987654321',
    applyType: '企业商户',
    legalPerson: '李四',
    businessLicense: '91310115MA01CD3E4Z',
    bankInfo: '工商银行 6222021234567890',
    creator: '王运营',
  },
  {
    merchantId: '1003',
    name: '广州市绿源生鲜店',
    address: '广州市天河区天河路385号',
    phone: '15812345678',
    applyType: '个体商户',
    legalPerson: '王五',
    businessLicense: '92440101MA01EF4G5H',
    bankInfo: '农业银行 6228481234567890',
    creator: '陈运营',
  },
  {
    merchantId: '1004',
    name: '深圳市科技数码专营店',
    address: '深圳市南山区科技园南区T2栋101',
    phone: '13612345678',
    applyType: '个体商户',
    legalPerson: '赵六',
    businessLicense: '92440300MA01GH5I6J',
    bankInfo: '招商银行 6225881234567890',
    creator: '赵运营',
  },
  {
    merchantId: '1005',
    name: '成都川味小吃有限公司',
    address: '成都市锦江区红星路三段99号',
    phone: '18712345678',
    applyType: '企业商户',
    legalPerson: '孙七',
    businessLicense: '91510104MA01IJ6K7L',
    bankInfo: '中国银行 6216621234567890',
    creator: '孙运营',
  },
]

// mock数据 - 商户变更
const merchantChangeData: MerchantAuditDetail[][] = [
  [
    // 旧数据
    {
      merchantId: '1001',
      name: '北京优品食品有限公司',
      address: '北京市朝阳区望京SOHO T1 2501',
      phone: '13812345678',
      applyType: '企业商户',
      legalPerson: '张三',
      businessLicense: '91110105MA01AB2X3Y',
      bankInfo: '建设银行 6217001234567890',
      creator: '刘运营',
    },
    // 新数据（变更地址和银行信息）
    {
      merchantId: '1001',
      name: '北京优品食品有限公司',
      address: '北京市海淀区中关村大街1号',
      phone: '13812345678',
      applyType: '企业商户',
      legalPerson: '张三',
      businessLicense: '91110105MA01AB2X3Y',
      bankInfo: '招商银行 6225881234567890',
      creator: '刘运营',
    },
  ],
  [
    // 旧数据
    {
      merchantId: '1002',
      name: '上海星宸贸易有限公司',
      address: '上海市浦东新区陆家嘴环路1233号',
      phone: '13987654321',
      applyType: '企业商户',
      legalPerson: '李四',
      businessLicense: '91310115MA01CD3E4Z',
      bankInfo: '工商银行 6222021234567890',
      creator: '王运营',
    },
    // 新数据（变更法人和联系电话）
    {
      merchantId: '1002',
      name: '上海星宸贸易有限公司',
      address: '上海市浦东新区陆家嘴环路1233号',
      phone: '13888888888',
      applyType: '企业商户',
      legalPerson: '李小四',
      businessLicense: '91310115MA01CD3E4Z',
      bankInfo: '工商银行 6222021234567890',
      creator: '王运营',
    },
  ],
  [
    // 旧数据
    {
      merchantId: '1003',
      name: '广州市绿源生鲜店',
      address: '广州市天河区天河路385号',
      phone: '15812345678',
      applyType: '个体商户',
      legalPerson: '王五',
      businessLicense: '92440101MA01EF4G5H',
      bankInfo: '农业银行 6228481234567890',
      creator: '陈运营',
    },
    // 新数据（变更商户名称和申请类别）
    {
      merchantId: '1003',
      name: '广州市绿源优选生鲜店',
      address: '广州市天河区天河路385号',
      phone: '15812345678',
      applyType: '企业商户',
      legalPerson: '王五',
      businessLicense: '92440101MA01EF4G5H',
      bankInfo: '农业银行 6228481234567890',
      creator: '陈运营',
    },
  ],
  [
    // 旧数据
    {
      merchantId: '1004',
      name: '深圳市科技数码专营店',
      address: '深圳市南山区科技园南区T2栋101',
      phone: '13612345678',
      applyType: '个体商户',
      legalPerson: '赵六',
      businessLicense: '92440300MA01GH5I6J',
      bankInfo: '招商银行 6225881234567890',
      creator: '赵运营',
    },
    // 新数据（变更营业执照）
    {
      merchantId: '1004',
      name: '深圳市科技数码专营店',
      address: '深圳市南山区科技园南区T2栋101',
      phone: '13612345678',
      applyType: '个体商户',
      legalPerson: '赵六',
      businessLicense: '92440300MA02KL7M8N',
      bankInfo: '招商银行 6225881234567890',
      creator: '赵运营',
    },
  ],
  [
    // 旧数据
    {
      merchantId: '1005',
      name: '成都川味小吃有限公司',
      address: '成都市锦江区红星路三段99号',
      phone: '18712345678',
      applyType: '企业商户',
      legalPerson: '孙七',
      businessLicense: '91510104MA01IJ6K7L',
      bankInfo: '中国银行 6216621234567890',
      creator: '孙运营',
    },
    // 新数据（变更多项）
    {
      merchantId: '1005',
      name: '成都正宗川味小吃有限公司',
      address: '成都市武侯区高新西区58号',
      phone: '18712345678',
      applyType: '企业商户',
      legalPerson: '孙大七',
      businessLicense: '91510104MA01IJ6K7L',
      bankInfo: '中国银行 6216621234567890',
      creator: '孙运营',
    },
  ],
]
</script>
