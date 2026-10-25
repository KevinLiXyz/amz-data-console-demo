// 演示数据（全部为虚构样例，不含任何真实客户数据）
window.DEMO = {
  meta: { period: "2026-10-01 ~ 2026-10-25", store: "全部店铺", site: "全部站点" },

  kpi: [
    { key: "sales", label: "销售业绩", value: 131540, delta: -1.5, unit: "¥", hint: "较上期" },
    { key: "profit", label: "预估毛利", value: -21456, delta: -3.2, unit: "¥", hint: "毛利率 -16.3%" },
    { key: "refund", label: "退款额", value: -11342, delta: 0.8, unit: "¥", hint: "退款率 8.6%" },
    { key: "payable", label: "应付账款", value: 10000, delta: 2.4, unit: "¥", hint: "3 笔待付，最近到期 10-28" }
  ],

  trend: {
    labels: ["10-01", "10-04", "10-07", "10-10", "10-13", "10-16", "10-19", "10-22", "10-25"],
    sales: [8200, 9100, 7800, 12400, 13800, 11900, 16800, 18200, 21040],
    profit: [-1200, -800, -2100, 1400, 2600, 900, 3800, 4100, 5200]
  },

  cashflow: {
    labels: ["10-01", "10-05", "10-09", "10-13", "10-17", "10-21", "10-25"],
    income: [62000, 18000, 0, 42000, 26000, 0, 38000],
    expense: [12000, 46000, 9000, 0, 21000, 33000, 15000]
  },

  transit: [
    { lane: "深圳 → 洛杉矶", qty: 1280, eta: "2026-11-02", status: "海运在途" },
    { lane: "宁波 → 汉堡", qty: 640, eta: "2026-11-11", status: "海运在途" },
    { lane: "广州 → 纽约", qty: 320, eta: "2026-10-28", status: "清关中" },
    { lane: "义乌 → 洛杉矶", qty: 180, eta: "2026-10-26", status: "派送中" }
  ],

  stock: [
    { sku: "SKU-1001", name: "折叠收纳箱 60L", store: "US-A", warehouse: "LA 海外仓", qty: 820, age: "32 天", cost: 42.5, value: 34850, status: "正常" },
    { sku: "SKU-1002", name: "厨房沥水架", store: "US-A", warehouse: "LA 海外仓", qty: 64, age: "86 天", cost: 28.0, value: 1792, status: "库龄偏长" },
    { sku: "SKU-1003", name: "宠物自动喂食器", store: "US-B", warehouse: "NJ 海外仓", qty: 0, age: "—", cost: 96.0, value: 0, status: "缺货" },
    { sku: "SKU-1004", name: "车载吸尘器", store: "DE-A", warehouse: "汉堡海外仓", qty: 210, age: "12 天", cost: 118.0, value: 24780, status: "正常" },
    { sku: "SKU-1005", name: "硅胶烘焙垫 3 件套", store: "US-B", warehouse: "NJ 海外仓", qty: 1530, age: "45 天", cost: 12.4, value: 18972, status: "正常" }
  ],

  sales: [
    { sku: "SKU-1001", name: "折叠收纳箱 60L", store: "US-A", qty: 412, amount: 41200, refund: 2400, cost: 17510, freight: 1648, storage: 412, commission: 6180, ad: 3200, profit: 9850, margin: 23.9 },
    { sku: "SKU-1002", name: "厨房沥水架", store: "US-A", qty: 168, amount: 10080, refund: 920, cost: 4704, freight: 336, storage: 168, commission: 1512, ad: 1200, profit: 1240, margin: 12.3 },
    { sku: "SKU-1003", name: "宠物自动喂食器", store: "US-B", qty: 96, amount: 24000, refund: 3600, cost: 9216, freight: 960, storage: 240, commission: 3600, ad: 2800, profit: 3584, margin: 14.9 },
    { sku: "SKU-1004", name: "车载吸尘器", store: "DE-A", qty: 61, amount: 12810, refund: 640, cost: 7198, freight: 610, storage: 122, commission: 1922, ad: 900, profit: 1418, margin: 11.1 },
    { sku: "SKU-1005", name: "硅胶烘焙垫 3 件套", store: "US-B", qty: 530, amount: 15900, refund: 780, cost: 6572, freight: 636, storage: 159, commission: 2385, ad: 1450, profit: 3918, margin: 24.6 }
  ],

  finance: [
    { date: "2026-10-24", type: "支出", account: "招行对公", category: "头程运费", counterparty: "海派物流", amount: -15800, note: "10 月第 3 批海运" },
    { date: "2026-10-23", type: "收入", account: "PingPong", category: "店铺回款", counterparty: "Amazon US-A", amount: 38200, note: "10-09~10-15 结算" },
    { date: "2026-10-22", type: "支出", account: "招行对公", category: "采购货款", counterparty: "宁波恒美", amount: -33000, note: "PO-20261018 预付 50%" },
    { date: "2026-10-21", type: "支出", account: "Payoneer", category: "仓储费", counterparty: "LA 海外仓", amount: -4200, note: "9 月仓储+操作费" },
    { date: "2026-10-19", type: "收入", account: "PingPong", category: "店铺回款", counterparty: "Amazon DE-A", amount: 26400, note: "10-02~10-08 结算" },
    { date: "2026-10-17", type: "支出", account: "招行对公", category: "广告费", counterparty: "Amazon Ads", amount: -9600, note: "10 月上半月" }
  ],

  accounts: [
    { name: "招行对公", balance: 186400, currency: "CNY" },
    { name: "PingPong", balance: 64200, currency: "USD 折算" },
    { name: "Payoneer", balance: 23800, currency: "USD 折算" }
  ],

  payables: [
    { no: "PO-20261018", supplier: "宁波恒美", amount: 33000, paid: 16500, due: "2026-10-28" },
    { no: "PO-20261021", supplier: "深圳优品", amount: 12400, paid: 0, due: "2026-11-03" },
    { no: "PO-20261023", supplier: "海派物流", amount: 8800, paid: 0, due: "2026-11-08" }
  ],

  projects: [
    { code: "PD-2026-08", name: "宠物自动喂食器 2 代", stage: "打样", owner: "阿凯", cost: 18600, target: "2026-12-05", progress: 45 },
    { code: "PD-2026-09", name: "可折叠露营收纳箱", stage: "开模", owner: "小周", cost: 42300, target: "2026-11-20", progress: 62 },
    { code: "PD-2026-10", name: "车载吸尘器 Pro", stage: "选品评估", owner: "阿凯", cost: 3200, target: "2027-01-15", progress: 15 },
    { code: "PD-2026-07", name: "硅胶烘焙垫 4 件套", stage: "已上市", owner: "小周", cost: 25800, target: "2026-09-30", progress: 100 }
  ],

  suppliers: [
    { name: "宁波恒美", category: "塑料家居", samples: 6, pass: 4, rating: "A" },
    { name: "深圳优品", category: "小家电", samples: 4, pass: 2, rating: "B" },
    { name: "东莞禾木", category: "硅胶制品", samples: 8, pass: 7, rating: "A" }
  ],

  todos: [
    { level: "高", text: "SKU-1003 库存为 0，US-B 仍在售，建议暂停广告", time: "08:12" },
    { level: "中", text: "10-24 费用分摊未完成（头程 ¥15,800 未分摊到 SKU）", time: "昨天" },
    { level: "中", text: "PO-20261018 尾款 ¥16,500 将于 10-28 到期", time: "昨天" },
    { level: "低", text: "销售明细导入 10-24 有 3 行失败（SKU 未匹配）", time: "10-24" }
  ],

  imports: [
    { time: "2026-10-24 21:02", type: "销售明细", file: "sales_20261024.xlsx", rows: 320, ok: 317, fail: 3, by: "财务-小林" },
    { time: "2026-10-24 20:40", type: "库存流水", file: "stock_20261024.xlsx", rows: 85, ok: 85, fail: 0, by: "运营-阿凯" },
    { time: "2026-10-23 18:11", type: "资金流水", file: "cash_20261023.xlsx", rows: 42, ok: 42, fail: 0, by: "财务-小林" },
    { time: "2026-10-22 09:30", type: "采购入库", file: "po_20261022.xlsx", rows: 12, ok: 10, fail: 2, by: "运营-小周" }
  ],

  users: [
    { name: "老板", account: "boss", last: "2026-10-25 08:05", status: "启用" },
    { name: "阿凯", account: "kai", last: "2026-10-25 07:52", status: "启用" },
    { name: "小林", account: "lin", last: "2026-10-24 21:10", status: "启用" },
    { name: "小周", account: "zhou", last: "2026-10-23 17:40", status: "启用" },
    { name: "离职-老陈", account: "chen", last: "2026-09-30 18:22", status: "停用" }
  ],

  logs: [
    { time: "2026-10-25 07:52", user: "kai", module: "货物流", action: "编辑", detail: "SKU-1003 库存 12 → 0" },
    { time: "2026-10-24 21:02", user: "lin", module: "销售数据", action: "导入", detail: "sales_20261024.xlsx（3 行失败）" },
    { time: "2026-10-24 20:40", user: "kai", module: "货物流", action: "导入", detail: "stock_20261024.xlsx" },
    { time: "2026-10-24 09:12", user: "boss", module: "账号", action: "停用", detail: "用户 chen" }
  ],

  masters: {
    stores: [
      { code: "US-A", name: "美国店 A", site: "美国", status: "启用" },
      { code: "US-B", name: "美国店 B", site: "美国", status: "启用" },
      { code: "DE-A", name: "德国店 A", site: "德国", status: "启用" },
      { code: "UK-A", name: "英国店 A", site: "英国", status: "停用" }
    ],
    skus: [
      { sku: "SKU-1001", name: "折叠收纳箱 60L", category: "家居收纳", cost: 42.5, status: "在售" },
      { sku: "SKU-1002", name: "厨房沥水架", category: "厨房用品", cost: 28.0, status: "在售" },
      { sku: "SKU-1003", name: "宠物自动喂食器", category: "宠物用品", cost: 96.0, status: "在售" },
      { sku: "SKU-1004", name: "车载吸尘器", category: "汽车用品", cost: 118.0, status: "在售" },
      { sku: "SKU-1005", name: "硅胶烘焙垫 3 件套", category: "厨房用品", cost: 12.4, status: "在售" },
      { sku: "SKU-1006", name: "露营收纳箱 80L", category: "家居收纳", cost: 55.0, status: "停售" }
    ],
    warehouses: [
      { name: "LA 海外仓", type: "海外仓", location: "美国 洛杉矶", status: "启用" },
      { name: "NJ 海外仓", type: "海外仓", location: "美国 新泽西", status: "启用" },
      { name: "汉堡海外仓", type: "海外仓", location: "德国 汉堡", status: "启用" },
      { name: "海派物流", type: "货代", location: "深圳", status: "启用" },
      { name: "宁波恒美仓", type: "国内仓", location: "宁波", status: "启用" }
    ],
    subjects: [
      { code: "C-01", name: "采购货款", type: "支出", status: "启用" },
      { code: "C-02", name: "头程运费", type: "支出", status: "启用" },
      { code: "C-03", name: "仓储费", type: "支出", status: "启用" },
      { code: "C-04", name: "广告费", type: "支出", status: "启用" },
      { code: "C-05", name: "平台佣金", type: "支出", status: "启用" },
      { code: "C-06", name: "店铺回款", type: "收入", status: "启用" },
      { code: "C-07", name: "其他收入", type: "收入", status: "启用" }
    ]
  }
};
