// 演示数据（全部为虚构样例，不含任何真实客户数据）
(function () {
  const FX = { USD: 7.12, CAD: 5.22, BRL: 1.31, MXN: 0.39, EUR: 7.78, GBP: 9.15 };

  const sites = [
    { name: "美国", currency: "USD", status: "启用" },
    { name: "加拿大", currency: "CAD", status: "启用" },
    { name: "巴西", currency: "BRL", status: "启用" },
    { name: "墨西哥", currency: "MXN", status: "启用" },
    { name: "德国", currency: "EUR", status: "启用" },
    { name: "英国", currency: "GBP", status: "启用" }
  ];

  const stores = [
    { name: "深圳市星野科技有限公司", site: "美国", status: "启用", updated: "2026-10-25" },
    { name: "星野贸易（香港）有限公司", site: "美国", status: "启用", updated: "2026-10-25" },
    { name: "Nordwind GmbH", site: "德国", status: "启用", updated: "2026-10-24" },
    { name: "星野（上海）电子商务有限公司", site: "加拿大", status: "停用", updated: "2026-09-30" }
  ];

  // 一条记录 = 店铺(公司) × 站点(销售国) × SKU 的唯一身份
  const skus = [
    { sku: "SKU-1001", name: "折叠收纳箱 60L", spec: "深灰 / 60L", store: "深圳市星野科技有限公司", site: "美国", asin: "B0B8X1Q2M3", price: 35.99, baseQty: 4, cost: 92, delivery: 38, freight: 6, storage: 2 },
    { sku: "SKU-1002", name: "厨房沥水架", spec: "白色 / 双层", store: "深圳市星野科技有限公司", site: "美国", asin: "B0B7K4L9P1", price: 19.99, baseQty: 3, cost: 48, delivery: 26, freight: 3, storage: 1 },
    { sku: "SKU-1003", name: "宠物自动喂食器", spec: "白色 / 4L", store: "星野贸易（香港）有限公司", site: "美国", asin: "B0C2M8T6R4", price: 89.99, baseQty: 1, cost: 235, delivery: 82, freight: 12, storage: 4 },
    { sku: "SKU-1004", name: "车载吸尘器", spec: "黑色 / 无线", store: "Nordwind GmbH", site: "德国", asin: "B0D5N3V7S2", price: 69.99, baseQty: 1, cost: 205, delivery: 75, freight: 14, storage: 4 },
    { sku: "SKU-1005", name: "硅胶烘焙垫 3 件套", spec: "彩色 / 3 件套", store: "星野贸易（香港）有限公司", site: "美国", asin: "B0B9P2D4W8", price: 12.99, baseQty: 12, cost: 26, delivery: 14, freight: 2, storage: 0.5 },
    { sku: "SKU-1006", name: "露营折叠桌", spec: "木纹 / 120cm", store: "Nordwind GmbH", site: "德国", asin: "B0F1Q7H5K9", price: 45.99, baseQty: 2, cost: 128, delivery: 52, freight: 9, storage: 2 }
  ];

  // ---------- 广告活动（SP 商品推广 / SB 品牌推广 / SD 展示推广） ----------
  const campaigns = [
    { id: "SP-01", type: "SP", name: "收纳箱-精准长尾", sku: "SKU-1001", store: "深圳市星野科技有限公司", site: "美国", spend: 140, sales: 700, imp: 24000, clicks: 470, orders: 9 },
    { id: "SP-02", type: "SP", name: "沥水架-广泛匹配", sku: "SKU-1002", store: "深圳市星野科技有限公司", site: "美国", spend: 92, sales: 375, imp: 16400, clicks: 312, orders: 6 },
    { id: "SP-03", type: "SP", name: "喂食器-自动投放", sku: "SKU-1003", store: "星野贸易（香港）有限公司", site: "美国", spend: 118, sales: 500, imp: 12100, clicks: 264, orders: 3 },
    { id: "SB-01", type: "SB", name: "星野品牌旗舰", sku: "SKU-1001", store: "深圳市星野科技有限公司", site: "美国", spend: 86, sales: 310, imp: 18800, clicks: 205, orders: 4 },
    { id: "SD-01", type: "SD", name: "收纳箱-再营销", sku: "SKU-1001", store: "星野贸易（香港）有限公司", site: "美国", spend: 58, sales: 178, imp: 9600, clicks: 148, orders: 2 },
    { id: "SD-02", type: "SD", name: "吸尘器-商品定向", sku: "SKU-1004", store: "Nordwind GmbH", site: "德国", spend: 66, sales: 215, imp: 7400, clicks: 121, orders: 1 }
  ];

  // 确定性伪随机，保证每次打开数字一致
  let seed = 20261025;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

  const DAY = 86400000;
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dates = [];
  for (let t = Date.UTC(2026, 8, 1); t <= Date.UTC(2026, 9, 25); t += DAY) {
    const d = new Date(t);
    dates.push(fmt(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
  }

  const weekdayFactor = [0.92, 0.95, 1.0, 1.02, 1.05, 1.18, 1.24]; // 周日..周六
  const growth = (i) => 0.86 + i / dates.length * 0.28; // 9 月略低，10 月爬坡

  // ---------- 广告日数据 ----------
  const ads = [];
  dates.forEach((date, di) => {
    const wd = new Date(date + "T00:00:00").getDay();
    campaigns.forEach((c) => {
      const jitter = 0.82 + rnd() * 0.36;
      const f = weekdayFactor[wd] * growth(di) * jitter;
      const spend = Math.round(c.spend * f * 100) / 100;
      const sales = Math.round(c.sales * f * 100) / 100;
      const clicks = Math.round(c.clicks * f);
      const imp = Math.round(c.imp * f);
      ads.push({
        date, type: c.type, campaign: c.name, campaignId: c.id,
        store: c.store, site: c.site, sku: c.sku,
        impressions: imp, clicks, spend, sales,
        orders: Math.max(1, Math.round(c.orders * f))
      });
    });
  });

  const adBySkuDate = {};
  ads.forEach((a) => {
    const k = a.sku + "|" + a.date;
    adBySkuDate[k] = (adBySkuDate[k] || 0) + a.spend;
  });

  // ---------- 销售明细（按天 × 店铺 × 站点 × SKU） ----------
  const sales = [];
  dates.forEach((date, di) => {
    const wd = new Date(date + "T00:00:00").getDay();
    skus.forEach((s) => {
      const jitter = 0.72 + rnd() * 0.56;
      const qty = Math.max(0, Math.round(s.baseQty * weekdayFactor[wd] * growth(di) * jitter));
      if (!qty) return;
      const cny = FX[s.site === "德国" ? "EUR" : "USD"];
      const px = s.price * (0.96 + rnd() * 0.08);
      const amountLocal = Math.round(qty * px * 100) / 100;
      const amount = amountLocal * cny;
      const refund = amount * (0.025 + rnd() * 0.03);
      const commission = amount * 0.15;
      const ad = adBySkuDate[s.sku + "|" + date] || 0;
      const cost = s.cost * qty, freight = s.freight * qty, storage = s.storage * qty, delivery = s.delivery * qty;
      const profit = amount - refund - cost - freight - storage - commission - delivery - ad;
      sales.push({
        date, store: s.store, site: s.site, sku: s.sku, name: s.name, spec: s.spec, asin: s.asin,
        currency: s.site === "德国" ? "EUR" : "USD",
        qty, amountLocal, amount, refund, commission, delivery, cost, freight, storage, ad, profit,
        margin: amount ? +(profit / amount * 100).toFixed(1) : 0
      });
    });
  });

  // ---------- FBA 库存（不做海外仓） ----------
  const stock = [
    { sku: "SKU-1001", name: "折叠收纳箱 60L", spec: "深灰 / 60L", store: "深圳市星野科技有限公司", site: "美国", asin: "B0B8X1Q2M3", fba: 820, domestic: 600, inbound: 480, age90: 0, sales30: 512, eta: "2026-11-02", status: "正常" },
    { sku: "SKU-1002", name: "厨房沥水架", spec: "白色 / 双层", store: "深圳市星野科技有限公司", site: "美国", asin: "B0B7K4L9P1", fba: 64, domestic: 0, inbound: 0, age90: 64, sales30: 196, eta: "—", status: "断货风险" },
    { sku: "SKU-1003", name: "宠物自动喂食器", spec: "白色 / 4L", store: "星野贸易（香港）有限公司", site: "美国", asin: "B0C2M8T6R4", fba: 0, domestic: 300, inbound: 300, age90: 0, sales30: 96, eta: "2026-11-11", status: "已断货" },
    { sku: "SKU-1004", name: "车载吸尘器", spec: "黑色 / 无线", store: "Nordwind GmbH", site: "德国", asin: "B0D5N3V7S2", fba: 210, domestic: 0, inbound: 120, age90: 0, sales30: 61, eta: "2026-10-28", status: "偏紧" },
    { sku: "SKU-1005", name: "硅胶烘焙垫 3 件套", spec: "彩色 / 3 件套", store: "星野贸易（香港）有限公司", site: "美国", asin: "B0B9P2D4W8", fba: 1530, domestic: 0, inbound: 0, age90: 0, sales30: 530, eta: "—", status: "健康" },
    { sku: "SKU-1006", name: "露营折叠桌", spec: "木纹 / 120cm", store: "Nordwind GmbH", site: "德国", asin: "B0F1Q7H5K9", fba: 340, domestic: 200, inbound: 0, age90: 12, sales30: 88, eta: "2026-11-06", status: "偏紧" }
  ];

  // ---------- SKU 利润表（成本项每天可能变，录入时留更新日期） ----------
  const skuProfit = skus.map((s) => {
    const cny = FX[s.site === "德国" ? "EUR" : "USD"];
    const price = +(s.price * cny).toFixed(2);
    const commission = +(price * 0.15).toFixed(2);
    const ad = +(price * 0.10).toFixed(2);
    const refund = +(price * 0.04).toFixed(2);
    const profit = +(price - refund - s.cost - s.freight - s.storage - commission - s.delivery - ad).toFixed(2);
    return {
      sku: s.sku, name: s.name, spec: s.spec, store: s.store, site: s.site,
      price, refund, cost: s.cost, freight: s.freight, storage: s.storage,
      commission, delivery: s.delivery, ad, profit,
      margin: +(profit / price * 100).toFixed(1),
      updated: s.sku === "SKU-1002" ? "2026-10-24" : "2026-10-25"
    };
  });

  const purchases = [
    {
      no: "PO-20261018", type: "外采", batch: "B20261018-01", supplier: "宁波恒美", store: "深圳市星野科技有限公司", site: "美国",
      sku: "SKU-1001", name: "折叠收纳箱 60L", qty: 800, amount: 6600, paid: 3300, eta: "2026-10-26", shipTo: "FBA · US-A", owner: "小周", stage: 5,
      timeline: [
        { stage: "采购申请", time: "2026-10-18 09:20", by: "小周", note: "补货 800 件" },
        { stage: "审批", time: "2026-10-18 11:05", by: "老板", note: "同意" },
        { stage: "下单", time: "2026-10-18 15:40", by: "小周", note: "预付 50%" },
        { stage: "供应商发货", time: "2026-10-20 10:00", by: "宁波恒美", note: "已出库" },
        { stage: "头程运输", time: "2026-10-21 08:30", by: "海派物流", note: "宁波 → 洛杉矶" },
        { stage: "清关", time: "2026-10-24 14:10", by: "海派物流", note: "清关中" }
      ]
    },
    {
      no: "PO-20261021", type: "外采", batch: "B20261021-01", supplier: "深圳优品", store: "星野贸易（香港）有限公司", site: "美国",
      sku: "SKU-1003", name: "宠物自动喂食器", qty: 300, amount: 12400, paid: 0, eta: "2026-11-03", shipTo: "FBA · US-B", owner: "阿凯", stage: 2,
      timeline: [
        { stage: "采购申请", time: "2026-10-21 09:10", by: "阿凯", note: "断货补货" },
        { stage: "审批", time: "2026-10-21 10:30", by: "老板", note: "同意" },
        { stage: "下单", time: "2026-10-21 16:20", by: "阿凯", note: "待付定金" }
      ]
    },
    {
      no: "PO-20261023", type: "代加工", batch: "B20261023-01", supplier: "东莞禾木", store: "深圳市星野科技有限公司", site: "美国",
      sku: "SKU-1002", name: "厨房沥水架", qty: 1000, amount: 22800, paid: 6840, eta: "2026-11-12", shipTo: "FBA · US-A", owner: "小周", stage: 3,
      timeline: [
        { stage: "采购申请", time: "2026-10-23 09:00", by: "小周", note: "代加工订单" },
        { stage: "审批", time: "2026-10-23 09:40", by: "老板", note: "同意" },
        { stage: "下单", time: "2026-10-23 14:00", by: "小周", note: "按进度付款 30%" },
        { stage: "供应商发货", time: "2026-10-25 10:20", by: "东莞禾木", note: "首批 400 件" }
      ]
    },
    {
      no: "PO-20261014", type: "外采", batch: "B20261014-01", supplier: "宁波恒美", store: "Nordwind GmbH", site: "德国",
      sku: "SKU-1006", name: "露营折叠桌", qty: 500, amount: 26000, paid: 26000, eta: "2026-10-20", shipTo: "FBA · DE-A", owner: "阿凯", stage: 8,
      timeline: [
        { stage: "采购申请", time: "2026-10-14 09:00", by: "阿凯", note: "德国站补货" },
        { stage: "审批", time: "2026-10-14 10:10", by: "老板", note: "同意" },
        { stage: "下单", time: "2026-10-14 11:30", by: "阿凯", note: "全款" },
        { stage: "供应商发货", time: "2026-10-15 09:00", by: "宁波恒美", note: "已出库" },
        { stage: "头程运输", time: "2026-10-15 15:00", by: "海派物流", note: "宁波 → 汉堡" },
        { stage: "清关", time: "2026-10-18 10:00", by: "海派物流", note: "已清关" },
        { stage: "到仓", time: "2026-10-19 09:00", by: "Nordwind", note: "到仓" },
        { stage: "入库上架", time: "2026-10-19 16:00", by: "Nordwind", note: "已上架" },
        { stage: "出库发货", time: "2026-10-20 10:00", by: "Nordwind", note: "已发 FBA" }
      ]
    },
    {
      no: "PO-20261025", type: "外采", batch: "B20261025-01", supplier: "深圳优品", store: "星野贸易（香港）有限公司", site: "美国",
      sku: "SKU-1005", name: "硅胶烘焙垫 3 件套", qty: 2000, amount: 31000, paid: 0, eta: "2026-11-20", shipTo: "FBA · US-B", owner: "小周", stage: 1,
      timeline: [
        { stage: "采购申请", time: "2026-10-25 08:50", by: "小周", note: "旺季备货" },
        { stage: "审批", time: "2026-10-25 09:30", by: "老板", note: "同意，等付款" }
      ]
    }
  ];

  const projects = [
    { code: "PD-2026-08", name: "宠物自动喂食器 2 代", stage: "打样", step: 1, owner: "阿凯", cost: 18600, target: "2026-12-05" },
    { code: "PD-2026-09", name: "可折叠露营收纳箱", stage: "量产", step: 2, owner: "小周", cost: 42300, target: "2026-11-20" },
    { code: "PD-2026-10", name: "车载吸尘器 Pro", stage: "选品评估", step: 0, owner: "阿凯", cost: 3200, target: "2027-01-15" },
    { code: "PD-2026-07", name: "硅胶烘焙垫 4 件套", stage: "上市", step: 3, owner: "小周", cost: 25800, target: "2026-09-30" }
  ];

  const suppliers = [
    { name: "宁波恒美", category: "塑料家居", contact: "王工 138****2210", rating: "A", status: "启用" },
    { name: "深圳优品", category: "小家电", contact: "李经理 139****8821", rating: "B", status: "启用" },
    { name: "东莞禾木", category: "硅胶制品", contact: "陈小姐 137****6633", rating: "A", status: "启用" },
    { name: "义乌新程", category: "户外用品", contact: "赵工 135****9012", rating: "B", status: "启用" }
  ];

  window.DEMO = {
    meta: { period: "2026-10-01 ~ 2026-10-25", store: "全部店铺", site: "全部站点" },
    fx: FX,
    sites,
    stores,
    skus,
    campaigns,
    ads,
    sales,
    stock,
    skuProfit,
    purchases,
    purchaseStages: ["采购申请", "审批", "下单", "供应商发货", "头程运输", "清关", "到仓", "入库上架", "出库发货"],
    projects,
    projectStages: ["选品评估", "打样", "量产", "上市"],
    suppliers,

    trendDays: dates,

    todos: [
      { level: "高", text: "宠物自动喂食器 FBA 可售库存为 0（US-B）", module: "库存", suggest: "空运 300 件或调拨", time: "10-25 08:10", status: "待处理" },
      { level: "高", text: "SKU-1002 可售天数 9 天，低于安全线", module: "库存", suggest: "发起采购 / 提报补货", time: "10-25 08:10", status: "待处理" },
      { level: "中", text: "PO-20261021 已过付款节点，未付定金", module: "采购", suggest: "确认付款或改期", time: "10-24 17:20", status: "待处理" },
      { level: "中", text: "SD-02 广告 ACOS 41%，高于目标 25%", module: "广告", suggest: "降竞价 / 关低效词", time: "10-24 09:05", status: "待处理" },
      { level: "低", text: "10-24 销售导入 3 行失败（ASIN 缺失）", module: "导入", suggest: "补 ASIN 后重导", time: "10-24 08:40", status: "已处理" }
    ],

    transit: [
      { lane: "深圳 → 洛杉矶", qty: 1280, eta: "2026-11-02", status: "海运在途" },
      { lane: "宁波 → 汉堡", qty: 640, eta: "2026-11-11", status: "海运在途" },
      { lane: "广州 → 纽约", qty: 320, eta: "2026-10-28", status: "清关中" },
      { lane: "义乌 → 洛杉矶", qty: 180, eta: "2026-10-26", status: "派送中" }
    ],

    cashflow: {
      labels: ["09-01", "09-08", "09-15", "09-22", "09-29", "10-06", "10-13", "10-20", "10-25"],
      income: [62000, 58000, 74000, 69000, 81000, 72000, 66000, 88000, 76000],
      expense: [52000, 61000, 58000, 72000, 64000, 69000, 58000, 74000, 66000]
    },

    finance: (function () {
      const out = [];
      dates.forEach((date, i) => {
        const wd = new Date(date + "T00:00:00").getDay();
        if (wd === 5) out.push({ date, type: "收入", account: "PingPong", category: "店铺回款", counterparty: "Amazon US", amount: Math.round(28000 + rnd() * 18000), note: "本周店铺结算" });
        if (wd === 1) out.push({ date, type: "支出", account: "招行对公", category: "采购货款", counterparty: "宁波恒美", amount: -Math.round(18000 + rnd() * 16000), note: "采购合同付款" });
        if (wd === 3) out.push({ date, type: "支出", account: "招行对公", category: "头程运费", counterparty: "海派物流", amount: -Math.round(8000 + rnd() * 6000), note: "海运头程" });
        if (wd === 2) out.push({ date, type: "支出", account: "招行对公", category: "广告费", counterparty: "Amazon Ads", amount: -Math.round(6000 + rnd() * 3000), note: "广告账户充值" });
        if (i % 9 === 0) out.push({ date, type: "支出", account: "Payoneer", category: "FBA 仓储费", counterparty: "Amazon FBA", amount: -Math.round(2800 + rnd() * 1800), note: "FBA 仓储与操作费" });
      });
      return out.reverse();
    })(),

    accounts: [
      { name: "招行对公", balance: 186400, currency: "CNY" },
      { name: "PingPong", balance: 64200, currency: "USD 折算" },
      { name: "Payoneer", balance: 23800, currency: "USD 折算" }
    ],

    payables: [
      { no: "PO-20261018", supplier: "宁波恒美", amount: 33000, paid: 16500, due: "2026-10-28" },
      { no: "PO-20261021", supplier: "深圳优品", amount: 12400, paid: 0, due: "2026-11-03" },
      { no: "PO-20261025", supplier: "深圳优品", amount: 31000, paid: 0, due: "2026-11-08" }
    ],

    users: [
      { name: "老板", account: "admin", last: "2026-10-25 11:40", status: "启用" },
      { name: "小周", account: "zhou", last: "2026-10-25 10:12", status: "启用" },
      { name: "阿凯", account: "kai", last: "2026-10-24 18:30", status: "启用" },
      { name: "财务小李", account: "li", last: "2026-10-25 09:05", status: "启用" },
      { name: "离职账号", account: "temp01", last: "2026-08-02 14:00", status: "停用" }
    ],

    logs: [
      { time: "2026-10-25 11:38", user: "老板", module: "广告运营", action: "新增", detail: "SP-01 10-24 广告数据" },
      { time: "2026-10-25 10:12", user: "小周", module: "销售数据", action: "新增", detail: "10-24 销售明细 6 条" },
      { time: "2026-10-25 09:05", user: "财务小李", module: "资金流水", action: "新增", detail: "头程运费 ¥15,800" },
      { time: "2026-10-24 18:30", user: "阿凯", module: "采购管理", action: "推进", detail: "PO-20261023 → 供应商发货" }
    ],

    imports: [
      { time: "2026-10-25 10:12", type: "销售明细", file: "销售明细-20261024.xlsx", rows: 6, ok: 6, fail: 0, by: "小周" },
      { time: "2026-10-25 11:38", type: "广告数据", file: "广告-SP-20261024.xlsx", rows: 6, ok: 6, fail: 0, by: "老板" },
      { time: "2026-10-24 08:40", type: "销售明细", file: "销售明细-20261023.xlsx", rows: 9, ok: 6, fail: 3, by: "阿凯" }
    ]
  };
})();
