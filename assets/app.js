/* AMZ 数据台 · 交互原型（演示数据，无后端） */
(function () {
  const D = window.DEMO;
  const money = (n) => {
    const v = Math.round(n);
    return (v < 0 ? "-¥" : "¥") + Math.abs(v).toLocaleString("en-US");
  };
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const pct = (n, d = 1) => (n > 0 ? "+" : "") + n.toFixed(d) + "%";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const state = {
    route: "overview",
    store: "全部店铺",
    site: "全部站点",
    period: "2026-10-01 ~ 2026-10-25",
    compare: true,
    masterTab: "stores",
    todoFilter: "全部",
    impStep: 1,
    impType: "销售明细"
  };

  const factor = () => {
    let f = 1;
    if (state.store === "US-A") f *= 0.52;
    if (state.store === "US-B") f *= 0.33;
    if (state.store === "DE-A") f *= 0.15;
    if (state.site === "美国") f *= 0.85;
    if (state.site === "德国") f *= 0.15;
    return f;
  };

  const titles = {
    overview: ["首页总览", "钱去哪了、货在哪、卖得怎么样，一屏看完"],
    todo: ["待办中心", "异常、待付款、未分摊，按优先级处理"],
    cash: ["资金流动", "账户余额、收支流水、费用分摊与应付账款"],
    goods: ["货物流动", "采购 → 头程 → 在途 → 海外仓库存，一本账"],
    sales: ["销售数据", "销量、售价、退款与 SKU 毛利"],
    product: ["产品开发", "项目台账、供应商打样与开发成本归集"],
    import: ["数据导入", "Excel 模板下载、导入校验与失败行反馈"],
    master: ["基础档案", "店铺、SKU、仓库、费用科目的维护入口"],
    account: ["账号与日志", "账号增停、重置密码、操作留痕"]
  };

  /* ---------------- 表单定义 ---------------- */
  const FORMS = {
    store: {
      title: "店铺", coll: "stores", key: "code",
      fields: [
        { k: "code", l: "店铺代码", t: "text", req: 1, ph: "如 US-C" },
        { k: "name", l: "店铺名称", t: "text", req: 1 },
        { k: "site", l: "站点", t: "select", opts: ["美国", "德国", "英国", "加拿大"] },
        { k: "status", l: "状态", t: "select", opts: ["启用", "停用"] }
      ]
    },
    sku: {
      title: "产品", coll: "skus", key: "sku",
      fields: [
        { k: "sku", l: "SKU 编码", t: "text", req: 1, ph: "如 SKU-1007" },
        { k: "name", l: "产品名称", t: "text", req: 1 },
        { k: "category", l: "品类", t: "text" },
        { k: "cost", l: "采购成本（¥）", t: "number" },
        { k: "status", l: "状态", t: "select", opts: ["在售", "停售"] }
      ]
    },
    warehouse: {
      title: "仓库 / 货代", coll: "warehouses", key: "name",
      fields: [
        { k: "name", l: "仓库名称", t: "text", req: 1 },
        { k: "type", l: "类型", t: "select", opts: ["海外仓", "国内仓", "货代"] },
        { k: "location", l: "所在地", t: "text" },
        { k: "status", l: "状态", t: "select", opts: ["启用", "停用"] }
      ]
    },
    subject: {
      title: "费用科目", coll: "subjects", key: "code",
      fields: [
        { k: "code", l: "科目编码", t: "text", req: 1, ph: "如 C-08" },
        { k: "name", l: "科目名称", t: "text", req: 1 },
        { k: "type", l: "方向", t: "select", opts: ["支出", "收入"] },
        { k: "status", l: "状态", t: "select", opts: ["启用", "停用"] }
      ]
    },
    finance: {
      title: "收支流水", coll: "finance", key: "_id",
      fields: [
        { k: "date", l: "日期", t: "date", req: 1 },
        { k: "type", l: "类型", t: "select", opts: ["支出", "收入"] },
        { k: "account", l: "账户", t: "select", opts: ["招行对公", "PingPong", "Payoneer"] },
        { k: "category", l: "科目", t: "select", opts: ["采购货款", "头程运费", "仓储费", "广告费", "平台佣金", "店铺回款", "其他收入"] },
        { k: "counterparty", l: "对方单位", t: "text" },
        { k: "amount", l: "金额（¥，支出填正数）", t: "number", req: 1 },
        { k: "note", l: "备注", t: "text" }
      ]
    },
    stock: {
      title: "库存记录", coll: "stock", key: "_id",
      fields: [
        { k: "sku", l: "SKU", t: "select", opts: () => D.masters.skus.map(s => s.sku) },
        { k: "name", l: "产品名称", t: "text" },
        { k: "store", l: "店铺", t: "select", opts: ["US-A", "US-B", "DE-A"] },
        { k: "warehouse", l: "仓库", t: "select", opts: () => D.masters.warehouses.filter(w => w.type === "海外仓").map(w => w.name) },
        { k: "qty", l: "可用库存", t: "number", req: 1 },
        { k: "cost", l: "成本价（¥）", t: "number" },
        { k: "age", l: "库龄", t: "text", ph: "如 32 天" },
        { k: "status", l: "状态", t: "select", opts: ["正常", "库龄偏长", "缺货"] }
      ]
    },
    sales: {
      title: "销售记录", coll: "sales", key: "_id",
      fields: [
        { k: "sku", l: "SKU", t: "select", opts: () => D.masters.skus.map(s => s.sku) },
        { k: "name", l: "产品名称", t: "text" },
        { k: "store", l: "店铺", t: "select", opts: ["US-A", "US-B", "DE-A"] },
        { k: "qty", l: "销量", t: "number", req: 1 },
        { k: "amount", l: "销售额（¥）", t: "number", req: 1 },
        { k: "refund", l: "退款（¥）", t: "number" },
        { k: "cost", l: "采购成本（¥）", t: "number" },
        { k: "commission", l: "平台佣金（¥）", t: "number" },
        { k: "ad", l: "广告费（¥）", t: "number" },
        { k: "freight", l: "头程分摊（¥）", t: "number" },
        { k: "storage", l: "仓储分摊（¥）", t: "number" }
      ]
    },
    project: {
      title: "开发项目", coll: "projects", key: "_id",
      fields: [
        { k: "code", l: "项目编号", t: "text", req: 1, ph: "如 PD-2026-11" },
        { k: "name", l: "项目名称", t: "text", req: 1 },
        { k: "stage", l: "阶段", t: "select", opts: ["选品评估", "打样", "开模", "量产", "已上市"] },
        { k: "owner", l: "负责人", t: "text" },
        { k: "cost", l: "已投入（¥）", t: "number" },
        { k: "target", l: "目标上市", t: "date" },
        { k: "progress", l: "完成度（%）", t: "number" }
      ]
    }
  };

  /* ---------------- 通用组件 ---------------- */
  const badge = (text, cls) => `<span class="badge ${cls}">${esc(text)}</span>`;
  const emptyRow = (cols, text = "没有数据") => `<tr><td colspan="${cols}" class="empty">${text}</td></tr>`;

  function kpiCard(k) {
    const v = k.value * factor();
    return `<div class="card kpi">
      <div class="label">${k.label}</div>
      <div class="value ${v < 0 ? "neg" : ""}">${money(v)}</div>
      <div class="foot">
        ${state.compare ? `<span class="delta ${k.delta >= 0 ? "up" : "down"}">${pct(k.delta)}</span><span>较上期</span>` : `<span>本期</span>`}
        <span class="muted">·</span><span>${k.hint}</span>
      </div>
    </div>`;
  }

  const actions = (entity, key) => `<div class="row-actions">
    <button class="link" data-act="edit" data-entity="${entity}" data-key="${key}">编辑</button>
    <button class="link danger" data-act="del" data-entity="${entity}" data-key="${key}">删除</button>
  </div>`;

  const cardHead = (title, sub, right = "") => `<div class="card-head"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}${right ? `<div class="right">${right}</div>` : ""}</div>`;

  const searchBox = (ph) => `<input class="search" data-filter placeholder="${ph}" />`;

  /* ---------------- 视图 ---------------- */
  function todoPage() {
    const filter = state.todoFilter || "全部";
    const levels = ["全部", "高", "中", "低"];
    const counts = { "高": 0, "中": 0, "低": 0 };
    D.todos.forEach(t => { counts[t.level] = (counts[t.level] || 0) + 1; });
    const list = D.todos.map((t, i) => ({ t, i })).filter(({ t }) => filter === "全部" || t.level === filter);
    const rows = list.map(({ t, i }) => `<tr data-row>
      <td>${badge(t.level, t.level === "高" ? "red" : t.level === "中" ? "amber" : "gray")}</td>
      <td class="name">${esc(t.text)}</td>
      <td>${esc(t.module)}</td>
      <td class="muted">${esc(t.suggest)}</td>
      <td class="muted">${t.time}</td>
      <td>${t.status === "已处理" ? badge("已处理", "green") : badge("待处理", "amber")}</td>
      <td class="num"><button class="link" data-act="todo-done" data-key="${i}">处理</button>
      <button class="link danger" data-act="todo-done" data-key="${i}">忽略</button></td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">待处理</div><div class="value">${D.todos.filter(t => t.status !== "已处理").length}</div><div class="foot"><span>全部来源：导入 / 库存 / 应付</span></div></div>
        <div class="card kpi"><div class="label">高优先级</div><div class="value neg">${counts["高"]}</div><div class="foot"><span>缺货、负库存、对账不平</span></div></div>
        <div class="card kpi"><div class="label">中优先级</div><div class="value">${counts["中"]}</div><div class="foot"><span>未分摊、应付款到期</span></div></div>
        <div class="card kpi"><div class="label">低优先级</div><div class="value">${counts["低"]}</div><div class="foot"><span>导入失败行</span></div></div>
      </div>
      <div class="card">
        ${cardHead("待办列表", `${list.length} 条`)}
        <div class="toolbar"><div class="tabs">${levels.map(l => `<button class="tab ${filter === l ? "active" : ""}" data-act="todo-filter" data-level="${l}">${l}${l === "全部" ? ` <span class="cnt">${D.todos.length}</span>` : ` <span class="cnt">${counts[l] || 0}</span>`}</button>`).join("")}</div>
          <div class="right">${searchBox("搜索内容 / 模块")}</div></div>
        <table class="table"><thead><tr><th>级别</th><th>内容</th><th>关联模块</th><th>建议动作</th><th>时间</th><th>状态</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(7, "没有待办")}</tbody></table>
        <div class="hr"></div>
        <div class="note">待办由规则自动生成：库存为负或为 0 且在售、费用未分摊、应付到期前 7 天、导入失败行。不使用消息推送，进系统即可看到。</div>
      </div>`;
  }

  function overview() {
    const f = factor();
    const todos = D.todos.map(t => {
      const cls = t.level === "高" ? "high" : t.level === "中" ? "mid" : "low";
      return `<div class="todo-item"><span class="dot ${cls}"></span><div class="txt">${esc(t.text)}</div><div class="tm">${t.time}</div></div>`;
    }).join("");
    const transit = D.transit.map(t => `<tr data-row><td class="name">${esc(t.lane)}</td><td class="num">${num(t.qty * f)} 件</td>
      <td>${badge(t.status, t.status === "清关中" ? "amber" : t.status === "派送中" ? "blue" : "gray")}</td><td class="muted num">${t.eta}</td></tr>`).join("");
    const stockRows = D.stock.slice(0, 4).map(s => `<tr data-row><td class="name">${esc(s.sku)}<div class="muted">${esc(s.name)}</div></td>
      <td>${s.store}</td><td class="num">${num(s.qty * f)}</td><td class="num">${s.age}</td>
      <td>${s.status === "正常" ? badge("正常", "green") : s.status === "缺货" ? badge("缺货", "red") : badge(s.status, "amber")}</td></tr>`).join("");

    return `
      <div class="grid g4">${D.kpi.map(kpiCard).join("")}</div>
      <div class="grid g2">
        <div class="card">${cardHead("销售与毛利趋势", "按日", `<a class="btn ghost" href="#/sales">看明细</a>`)}
          <div class="chart-wrap"><canvas id="cTrend"></canvas></div></div>
        <div class="card">${cardHead("待办与异常提醒", "4 条")}<div class="todo">${todos}</div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("资金收支", "收入 / 支出")}<div class="chart-wrap sm"><canvas id="cCash"></canvas></div></div>
        <div class="card">${cardHead("货物在途", "4 条航线", `<a class="btn ghost" href="#/goods">看台账</a>`)}
          <table class="table"><thead><tr><th>航线</th><th class="num">数量</th><th>状态</th><th class="num">预计到仓</th></tr></thead><tbody>${transit}</tbody></table></div>
      </div>
      <div class="card">${cardHead("库存快照", "海外仓", `<a class="btn ghost" href="#/goods">查看台账</a>`)}
        <table class="table"><thead><tr><th>SKU</th><th>店铺</th><th class="num">可用库存</th><th class="num">库龄</th><th>状态</th></tr></thead><tbody>${stockRows}</tbody></table></div>`;
  }

  function cash() {
    const f = factor();
    const balance = D.accounts.reduce((s, a) => s + a.balance, 0) * f;
    const income = 168000 * f, expense = 136000 * f;
    const rows = D.finance.map((r, i) => `<tr data-row>
      <td class="muted">${r.date}</td><td>${badge(r.type, r.type === "收入" ? "green" : "gray")}</td>
      <td>${esc(r.account)}</td><td>${esc(r.category)}</td><td>${esc(r.counterparty)}</td>
      <td class="num">${money(r.amount * f)}</td><td class="muted">${esc(r.note)}</td>
      <td class="num">${actions("finance", i)}</td></tr>`).join("");
    const payables = D.payables.map(p => `<tr data-row><td class="name">${p.no}</td><td>${p.supplier}</td>
      <td class="num">${money(p.amount * f)}</td><td class="num">${money(p.paid * f)}</td><td class="num">${money((p.amount - p.paid) * f)}</td><td class="num">${p.due}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">账户余额合计</div><div class="value">${money(balance)}</div><div class="foot"><span>3 个账户</span></div></div>
        <div class="card kpi"><div class="label">本期收入</div><div class="value">${money(income)}</div><div class="foot"><span class="delta up">${pct(6.4)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">本期支出</div><div class="value">${money(expense)}</div><div class="foot"><span class="delta down">${pct(9.1)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">净现金流</div><div class="value ${income - expense < 0 ? "neg" : ""}">${money(income - expense)}</div><div class="foot"><span>含在途应付 ${money(54200 * f)}</span></div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("收支趋势", "按周汇总")}<div class="chart-wrap"><canvas id="cFlow"></canvas></div></div>
        <div class="card">${cardHead("账户余额", "按账户")}
          <div class="mini-list">${D.accounts.map(a => {
            const v = a.balance * f, w = Math.max(6, Math.round(v / (balance || 1) * 100));
            return `<div class="mini-row"><div class="k">${a.name}</div><div class="bar"><i style="width:${w}%"></i></div><div class="v">${money(v)}</div></div>`;
          }).join("")}</div>
          <div class="hr"></div>
          <div class="note">费用分摊：本期头程 ¥15,800、仓储 ¥4,200 已按采购数量分摊到 SKU；未分摊金额 ¥0。</div></div>
      </div>
      <div class="card">${cardHead("收支明细", `共 ${D.finance.length} 条`, `${searchBox("搜索对方单位 / 科目")}<button class="btn" data-act="toast" data-msg="筛选面板：日期 / 类型 / 科目 / 账户（演示）">筛选</button><button class="btn primary" data-act="edit" data-entity="finance">＋ 登记流水</button>`)}
        <table class="table"><thead><tr><th>日期</th><th>类型</th><th>账户</th><th>科目</th><th>对方单位</th><th class="num">金额</th><th>备注</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(8)}</tbody></table></div>
      <div class="card">${cardHead("应付账款", "采购未付与物流费", badge("3 笔待付 · 最近 10-28 到期", "amber"))}
        <table class="table"><thead><tr><th>采购单号</th><th>供应商</th><th class="num">金额</th><th class="num">已付</th><th class="num">未付</th><th class="num">到期日</th></tr></thead>
        <tbody>${payables}</tbody></table></div>`;
  }

  function goods() {
    const f = factor();
    const list = D.stock.map((s, i) => ({ s, i })).filter(({ s }) => state.store === "全部店铺" || s.store === state.store);
    const rows = list.map(({ s, i }) => `<tr data-row>
      <td class="name">${esc(s.sku)}<div class="muted">${esc(s.name)}</div></td><td>${s.store}</td><td>${esc(s.warehouse)}</td>
      <td class="num">${num(s.qty * f)}</td><td class="num">${s.age}</td><td class="num">${money(s.cost)}</td><td class="num">${money(s.value * f)}</td>
      <td>${s.status === "正常" ? badge("正常", "green") : s.status === "缺货" ? badge("缺货", "red") : badge(s.status, "amber")}</td>
      <td class="num">${actions("stock", i)}</td></tr>`).join("");
    const transit = D.transit.map(t => `<tr data-row><td class="name">${esc(t.lane)}</td><td class="num">${num(t.qty * f)} 件</td>
      <td>${badge(t.status, t.status === "清关中" ? "amber" : t.status === "派送中" ? "blue" : "gray")}</td><td class="num">${t.eta}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">在途件数</div><div class="value">${num(2420 * f)}</div><div class="foot">4 条航线 · 最近到仓 10-26</div></div>
        <div class="card kpi"><div class="label">海外仓可用库存</div><div class="value">${num(2624 * f)}</div><div class="foot">4 个仓 · 5 个 SKU</div></div>
        <div class="card kpi"><div class="label">缺货 SKU</div><div class="value neg">1</div><div class="foot">US-B · 宠物自动喂食器</div></div>
        <div class="card kpi"><div class="label">库龄 &gt; 90 天</div><div class="value">${num(64 * f)} 件</div><div class="foot">1 个 SKU · 建议促销</div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("在途与到仓", "按航线")}
          <table class="table"><thead><tr><th>航线</th><th class="num">数量</th><th>状态</th><th class="num">预计到仓</th></tr></thead><tbody>${transit}</tbody></table></div>
        <div class="card">${cardHead("库龄分布", "按件数")}
          <div class="mini-list">
            <div class="mini-row"><div class="k">0–30 天</div><div class="bar"><i style="width:62%"></i></div><div class="v">1,630</div></div>
            <div class="mini-row"><div class="k">31–60 天</div><div class="bar"><i style="width:24%"></i></div><div class="v">630</div></div>
            <div class="mini-row"><div class="k">61–90 天</div><div class="bar"><i style="width:10%"></i></div><div class="v">300</div></div>
            <div class="mini-row"><div class="k">&gt; 90 天</div><div class="bar"><i style="width:2%"></i></div><div class="v">64</div></div>
          </div>
          <div class="hr"></div><div class="note">库存口径：移动加权平均计价；在途单列，不计入可用库存；可用 = 在库 − 锁定。</div></div>
      </div>
      <div class="card">${cardHead("海外仓库存台账", `${list.length} 个 SKU`, `${searchBox("搜索 SKU / 名称")}<button class="btn" data-act="edit" data-entity="stock">＋ 入库</button>`)}
        <table class="table"><thead><tr><th>SKU</th><th>店铺</th><th>仓库</th><th class="num">可用库存</th><th class="num">库龄</th><th class="num">成本价</th><th class="num">库存金额</th><th>状态</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(9, "当前筛选下没有数据")}</tbody></table></div>`;
  }

  function sales() {
    const f = factor();
    const list = D.sales.map((s, i) => ({ s, i })).filter(({ s }) => state.store === "全部店铺" || s.store === state.store);
    const rows = list.map(({ s, i }) => `<tr data-row>
      <td class="name">${esc(s.sku)}<div class="muted">${esc(s.name)}</div></td><td>${s.store}</td>
      <td class="num">${num(s.qty * f)}</td><td class="num">${money(s.amount * f)}</td><td class="num">${money(s.refund * f)}</td>
      <td class="num">${money(s.cost * f)}</td><td class="num">${money(s.commission * f)}</td><td class="num">${money(s.ad * f)}</td>
      <td class="num"><b>${money(s.profit * f)}</b></td>
      <td class="num">${badge(s.margin.toFixed(1) + "%", s.margin >= 20 ? "green" : s.margin >= 12 ? "amber" : "red")}</td>
      <td class="num">${actions("sales", i)}</td></tr>`).join("");
    const t = list.reduce((a, { s }) => ({ qty: a.qty + s.qty, amount: a.amount + s.amount, refund: a.refund + s.refund, profit: a.profit + s.profit }), { qty: 0, amount: 0, refund: 0, profit: 0 });

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">销售额</div><div class="value">${money(t.amount * f)}</div><div class="foot"><span class="delta down">${pct(-1.5)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">销量</div><div class="value">${num(t.qty * f)} 件</div><div class="foot"><span class="delta up">${pct(2.1)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">退款率</div><div class="value">8.6%</div><div class="foot"><span class="delta down">${pct(0.8)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">毛利</div><div class="value ${t.profit < 0 ? "neg" : ""}">${money(t.profit * f)}</div><div class="foot"><span>毛利率 14.9% · 口径含头程/仓储/佣金/广告</span></div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("SKU 毛利", "本期")}<div class="chart-wrap"><canvas id="cProfit"></canvas></div></div>
        <div class="card">${cardHead("多维对比", "店铺 × 月份")}
          <table class="table"><thead><tr><th>店铺</th><th class="num">9 月</th><th class="num">10 月</th><th class="num">环比</th></tr></thead><tbody>
            <tr data-row><td class="name">US-A</td><td class="num">¥68,400</td><td class="num">¥51,280</td><td class="num"><span class="badge red">-25.0%</span></td></tr>
            <tr data-row><td class="name">US-B</td><td class="num">¥32,900</td><td class="num">¥39,900</td><td class="num"><span class="badge green">+21.3%</span></td></tr>
            <tr data-row><td class="name">DE-A</td><td class="num">¥14,200</td><td class="num">¥12,810</td><td class="num"><span class="badge red">-9.8%</span></td></tr>
            <tr data-row><td class="name">合计</td><td class="num"><b>¥115,500</b></td><td class="num"><b>¥103,990</b></td><td class="num"><span class="badge red">-10.0%</span></td></tr>
          </tbody></table>
          <div class="hr"></div>
          <div class="muted" style="font-size:12px">口径：毛利 = 销售额 − 退款 − 采购成本 − 头程 − 仓储 − 平台佣金 − 广告；汇率按人工维护的静态表。</div></div>
      </div>
      <div class="card">${cardHead("销售明细", `共 ${list.length} 条`, `${searchBox("搜索 SKU")}<button class="btn" data-act="edit" data-entity="sales">＋ 新增</button>`)}
        <table class="table"><thead><tr><th>SKU</th><th>店铺</th><th class="num">销量</th><th class="num">销售额</th><th class="num">退款</th><th class="num">采购成本</th><th class="num">佣金</th><th class="num">广告</th><th class="num">毛利</th><th class="num">毛利率</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(11, "当前筛选下没有数据")}</tbody></table></div>`;
  }

  function product() {
    const rows = D.projects.map((p, i) => `<tr data-row>
      <td class="name">${esc(p.code)}<div class="muted">${esc(p.name)}</div></td>
      <td>${badge(p.stage, p.stage === "已上市" ? "green" : p.stage === "开模" ? "blue" : p.stage === "打样" ? "amber" : "gray")}</td>
      <td>${esc(p.owner)}</td><td class="num">${money(p.cost)}</td><td class="num">${p.target}</td>
      <td style="min-width:120px"><div class="progress"><i style="width:${p.progress}%"></i></div></td>
      <td class="num">${p.progress}%</td><td class="num">${actions("project", i)}</td></tr>`).join("");
    const sup = D.suppliers.map(s => `<tr data-row><td class="name">${esc(s.name)}</td><td>${esc(s.category)}</td><td class="num">${s.samples}</td><td class="num">${s.pass}</td><td>${badge(s.rating, s.rating === "A" ? "green" : "amber")}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">在研项目</div><div class="value">3</div><div class="foot">1 个已上市</div></div>
        <div class="card kpi"><div class="label">打样中</div><div class="value">1</div><div class="foot">宠物自动喂食器 2 代</div></div>
        <div class="card kpi"><div class="label">开发成本合计</div><div class="value">¥89,900</div><div class="foot">含打样、开模、认证</div></div>
        <div class="card kpi"><div class="label">平均开发周期</div><div class="value">96 天</div><div class="foot">选品到上市</div></div>
      </div>
      <div class="card">${cardHead("项目台账", `${D.projects.length} 个项目`, `<button class="btn primary" data-act="edit" data-entity="project">＋ 新建项目</button>`)}
        <table class="table"><thead><tr><th>项目</th><th>阶段</th><th>负责人</th><th class="num">已投入</th><th class="num">目标上市</th><th>进度</th><th class="num">完成度</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(8)}</tbody></table></div>
      <div class="grid g2e">
        <div class="card">${cardHead("供应商与打样", "3 家")}
          <table class="table"><thead><tr><th>供应商</th><th>品类</th><th class="num">打样次数</th><th class="num">通过</th><th>评级</th></tr></thead><tbody>${sup}</tbody></table></div>
        <div class="card">${cardHead("开发成本归集", "按项目")}
          <div class="mini-list">
            <div class="mini-row"><div class="k">露营收纳箱</div><div class="bar"><i style="width:88%"></i></div><div class="v">¥42,300</div></div>
            <div class="mini-row"><div class="k">烘焙垫 4 件套</div><div class="bar"><i style="width:54%"></i></div><div class="v">¥25,800</div></div>
            <div class="mini-row"><div class="k">喂食器 2 代</div><div class="bar"><i style="width:39%"></i></div><div class="v">¥18,600</div></div>
            <div class="mini-row"><div class="k">车载吸尘器 Pro</div><div class="bar"><i style="width:7%"></i></div><div class="v">¥3,200</div></div>
          </div>
          <div class="hr"></div><div class="note">打样费、开模费、认证费可从资金流水关联归集，避免重复录入。</div></div>
      </div>`;
  }

  function master() {
    const tabs = [["stores", "店铺"], ["skus", "产品 SKU"], ["warehouses", "仓库 / 货代"], ["subjects", "费用科目"]];
    const keys = { stores: "store", skus: "sku", warehouses: "warehouse", subjects: "subject" };
    const list = D.masters[state.masterTab] || [];
    const cols = {
      stores: ["店铺代码", "店铺名称", "站点", "状态"],
      skus: ["SKU", "产品名称", "品类", "成本价", "状态"],
      warehouses: ["仓库名称", "类型", "所在地", "状态"],
      subjects: ["科目编码", "科目名称", "方向", "状态"]
    }[state.masterTab];
    const rows = list.map((r, i) => {
      const cells = {
        stores: `<td class="name">${esc(r.code)}</td><td>${esc(r.name)}</td><td>${esc(r.site)}</td><td>${badge(r.status, r.status === "启用" ? "green" : "gray")}</td>`,
        skus: `<td class="name">${esc(r.sku)}</td><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td class="num">${money(r.cost)}</td><td>${badge(r.status, r.status === "在售" ? "green" : "gray")}</td>`,
        warehouses: `<td class="name">${esc(r.name)}</td><td>${esc(r.type)}</td><td>${esc(r.location)}</td><td>${badge(r.status, r.status === "启用" ? "green" : "gray")}</td>`,
        subjects: `<td class="name">${esc(r.code)}</td><td>${esc(r.name)}</td><td>${esc(r.type)}</td><td>${badge(r.status, r.status === "启用" ? "green" : "gray")}</td>`
      }[state.masterTab];
      return `<tr data-row>${cells}<td class="num">${actions(keys[state.masterTab], i)}</td></tr>`;
    }).join("");

    return `
      <div class="card">
        ${cardHead("基础档案", "先维护档案，再录业务数据", `<button class="btn primary" data-act="edit" data-entity="${keys[state.masterTab]}">＋ 新增</button>`)}
        <div class="toolbar">
          <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${state.masterTab === k ? "active" : ""}" data-act="tab" data-tab="${k}">${n} <span class="cnt">${(D.masters[k] || []).length}</span></button>`).join("")}</div>
          ${searchBox("搜索编码 / 名称")}
        </div>
        <table class="table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}<th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(cols.length + 1)}</tbody></table>
        <div class="hr"></div>
        <div class="note">档案停用后不影响历史数据，但不能在新单据中选择；删除仅用于录错的数据。</div>
      </div>`;
  }

  function importer() {
    const rows = D.imports.map(r => `<tr data-row><td class="muted">${r.time}</td><td>${r.type}</td><td class="name">${r.file}</td>
      <td class="num">${r.rows}</td><td class="num">${r.ok}</td><td class="num">${r.fail ? `<span class="badge red">${r.fail}</span>` : "0"}</td><td>${r.by}</td></tr>`).join("");
    const tpls = [
      ["资金流水模板", "日期、账户、科目、对方单位、金额、备注"],
      ["库存流水模板", "日期、SKU、仓库、出入库类型、数量、成本价"],
      ["销售明细模板", "日期、店铺、SKU、销量、销售额、退款、佣金、广告"],
      ["产品开发模板", "项目编号、名称、阶段、负责人、费用类型、金额"]
    ].map(([n, d]) => `<div class="tpl"><div class="ico">X</div><div><b>${n}</b><div class="muted" style="font-size:12px">${d}</div></div><div class="right"><button class="btn">下载</button></div></div>`).join("");

    const types = ["销售明细", "资金流水", "库存流水", "采购入库"];
    let wizard = "";
    if (state.impStep === 1) {
      wizard = `<div class="steps"><span class="step on">1 选择类型</span><span class="step">2 上传文件</span><span class="step">3 校验结果</span></div>
        <div class="choice-grid">${types.map(t => `<button class="choice ${state.impType === t ? "on" : ""}" data-act="imp-type" data-type="${t}">${t}<span class="muted">.xlsx</span></button>`).join("")}</div>
        <div class="toolbar" style="margin-top:14px"><button class="btn primary" data-act="imp-step" data-step="2">下一步</button></div>`;
    } else if (state.impStep === 2) {
      wizard = `<div class="steps"><span class="step done">1 选择类型</span><span class="step on">2 上传文件</span><span class="step">3 校验结果</span></div>
        <div class="dropzone" data-act="imp-step" data-step="3">把文件拖到这里，或 <b>点击选择文件</b><div class="muted" style="font-size:12px;margin-top:8px">当前类型：${state.impType} · 单次 ≤ 5,000 行 · 重复数据默认跳过并提示</div></div>
        <div class="toolbar" style="margin-top:14px"><button class="btn" data-act="imp-step" data-step="1">上一步</button><button class="btn primary" data-act="imp-step" data-step="3">开始校验</button></div>`;
    } else {
      wizard = `<div class="steps"><span class="step done">1 选择类型</span><span class="step done">2 上传文件</span><span class="step on">3 校验结果</span></div>
        <div class="grid g3">
          <div class="stat"><div class="muted">总行数</div><b>320</b></div>
          <div class="stat"><div class="muted">可导入</div><b class="ok">317</b></div>
          <div class="stat"><div class="muted">错误行</div><b class="err">3</b></div>
        </div>
        <table class="table" style="margin-top:12px"><thead><tr><th class="num">行号</th><th>错误字段</th><th>原因</th><th>建议</th></tr></thead><tbody>
          <tr><td class="num">18</td><td>SKU</td><td>SKU-9911 在档案中不存在</td><td>先在「基础档案」新增，或改为已有 SKU</td></tr>
          <tr><td class="num">24</td><td>日期</td><td>日期格式无法识别（2026/13/02）</td><td>改为 YYYY-MM-DD</td></tr>
          <tr><td class="num">31</td><td>店铺</td><td>店铺代码 US-C 未维护</td><td>先在「基础档案」新增店铺</td></tr>
        </tbody></table>
        <div class="toolbar" style="margin-top:14px"><button class="btn" data-act="imp-step" data-step="1">取消</button><button class="btn" data-act="imp-step" data-step="4">忽略错误行，导入 317 行</button><button class="btn primary" data-act="imp-step" data-step="4">修正后重新上传</button></div>`;
    }
    if (state.impStep === 4) {
      return `<div class="card"><div class="card-head"><h2>导入完成</h2><span class="sub">${state.impType}</span></div>
        <div class="done-box"><div class="done-ico">✓</div><div><b>成功导入 317 行</b><div class="muted" style="font-size:12.5px">失败 3 行已生成《失败明细》，可在导入记录里下载</div></div></div>
        <div class="toolbar" style="margin-top:16px"><button class="btn" data-act="imp-step" data-step="1">再导一次</button><a class="btn primary" href="#/overview">回总览</a></div></div>`;
    }

    return `
      <div class="grid g2">
        <div class="card">${cardHead("Excel 导入", "三步：选类型 → 上传 → 校验")}${wizard}</div>
        <div class="card">${cardHead("模板下载", "4 类")}${tpls}</div>
      </div>
      <div class="card">${cardHead("最近导入记录", "失败行会给出具体原因")}
        <table class="table"><thead><tr><th>时间</th><th>类型</th><th>文件</th><th class="num">总行数</th><th class="num">成功</th><th class="num">失败</th><th>操作人</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }

  function account() {
    const users = D.users.map(u => `<tr data-row><td class="name">${esc(u.name)}</td><td class="mono">${esc(u.account)}</td><td class="muted">${u.last}</td>
      <td>${u.status === "启用" ? badge("启用", "green") : badge("停用", "gray")}</td>
      <td class="num"><button class="link" data-act="toast" data-msg="已生成临时密码，请通知本人首次登录后修改">重置密码</button>
      <button class="link" data-act="toast" data-msg="${u.status === "启用" ? "账号已停用" : "账号已启用"}">${u.status === "启用" ? "停用" : "启用"}</button></td></tr>`).join("");
    const logs = D.logs.map(l => `<tr data-row><td class="muted">${l.time}</td><td>${l.user}</td><td>${l.module}</td><td>${badge(l.action, "blue")}</td><td class="muted">${l.detail}</td></tr>`).join("");

    return `
      <div class="grid g2">
        <div class="card">${cardHead("账号", "5 个（不做权限区分）", `<button class="btn primary" data-act="toast" data-msg="演示：新增账号走同一表单">＋ 新建账号</button>`)}
          <table class="table"><thead><tr><th>姓名</th><th>登录名</th><th>最后登录</th><th>状态</th><th class="num">操作</th></tr></thead><tbody>${users}</tbody></table>
          <div class="hr"></div><div class="note">按客户要求不做角色与模块权限：所有启用账号看到的内容相同，仅保留管理账号用于建号/停用/重置密码。</div></div>
        <div class="card">${cardHead("操作日志", "只读，不可删除")}
          <table class="table"><thead><tr><th>时间</th><th>操作人</th><th>模块</th><th>操作</th><th>详情</th></tr></thead><tbody>${logs}</tbody></table></div>
      </div>
      <div class="card">${cardHead("部署信息", "客户自有服务器")}
        <div class="grid g3">
          <div><div class="muted" style="font-size:12px">运行环境</div><div>轻量云服务器 · 宝塔面板</div></div>
          <div><div class="muted" style="font-size:12px">数据库</div><div>MySQL 8 · 每日 02:00 备份，保留 7 天</div></div>
          <div><div class="muted" style="font-size:12px">访问方式</div><div>浏览器访问（桌面），不做手机/平板适配</div></div>
        </div></div>`;
  }

  /* ---------------- 弹层表单 ---------------- */
  function drawerRoot() {
    let el = document.getElementById("drawerRoot");
    if (!el) {
      el = document.createElement("div");
      el.id = "drawerRoot";
      document.body.appendChild(el);
    }
    return el;
  }

  function openForm(entity, index) {
    const cfg = FORMS[entity];
    if (!cfg) return;
    const coll = entity === "store" || entity === "sku" || entity === "warehouse" || entity === "subject"
      ? D.masters[cfg.coll] : D[cfg.coll];
    const rec = index != null ? coll[index] : null;
    const fields = cfg.fields.map(f => {
      const opts = typeof f.opts === "function" ? f.opts() : f.opts;
      const v = rec ? rec[f.k] : (f.t === "select" ? (opts ? opts[0] : "") : "");
      const input = f.t === "select"
        ? `<select name="${f.k}">${opts.map(o => `<option ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
        : `<input name="${f.k}" type="${f.t}" value="${esc(v)}" placeholder="${f.ph || ""}" ${f.req ? "required" : ""} />`;
      return `<label class="field"><span>${f.l}${f.req ? `<i>*</i>` : ""}</span>${input}</label>`;
    }).join("");

    drawerRoot().innerHTML = `
      <div class="drawer-mask" data-act="close"></div>
      <aside class="drawer">
        <header><div><h3>${rec ? "编辑" : "新增"}${cfg.title}</h3><div class="muted" style="font-size:12px">${rec ? "修改后立即生效，操作会记入日志" : "保存后可在列表继续编辑"}</div></div>
          <button class="x" data-act="close">×</button></header>
        <form id="entityForm" data-entity="${entity}" data-index="${index == null ? "" : index}">
          <div class="form-body">${fields}</div>
          <footer><button type="button" class="btn" data-act="close">取消</button><button type="submit" class="btn primary">保存</button></footer>
        </form>
      </aside>`;
    document.body.classList.add("locked");
    setTimeout(() => { const i = document.querySelector("#entityForm input,#entityForm select"); if (i) i.focus(); }, 60);
  }

  function closeForm() {
    drawerRoot().innerHTML = "";
    document.body.classList.remove("locked");
  }

  function saveForm(form) {
    const entity = form.dataset.entity;
    const cfg = FORMS[entity];
    const idxRaw = form.dataset.index;
    const idx = idxRaw === "" ? null : Number(idxRaw);
    const coll = ["store", "sku", "warehouse", "subject"].includes(entity) ? D.masters[cfg.coll] : D[cfg.coll];
    const data = {};
    [...form.querySelectorAll("input,select")].forEach(el => {
      data[el.name] = el.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value.trim();
    });
    if (entity === "finance") data.amount = data.type === "收入" ? Math.abs(data.amount) : -Math.abs(data.amount);
    if (entity === "stock") data.value = Math.round((data.qty || 0) * (data.cost || 0));
    if (entity === "sales") {
      const cost = +data.cost || 0, refund = +data.refund || 0, commission = +data.commission || 0, ad = +data.ad || 0;
      data.freight = +data.freight || 0; data.storage = +data.storage || 0;
      data.profit = Math.round((+data.amount || 0) - refund - cost - data.freight - data.storage - commission - ad);
      data.margin = data.amount ? +(data.profit / data.amount * 100).toFixed(1) : 0;
    }
    if (entity === "project") data.progress = Math.max(0, Math.min(100, +data.progress || 0));

    if (idx == null) {
      if (entity === "finance") data.date = data.date || "2026-10-25";
      coll.unshift(data);
    } else {
      Object.assign(coll[idx], data);
    }
    closeForm();
    toast(idx == null ? "新增成功" : "已保存");
    render();
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------------- 图表 ---------------- */
  const charts = [];
  function addChart(ctx, cfg) {
    if (!window.Chart) return;
    cfg.options = Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { intersect: false, mode: "index" } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#93a0b4", font: { size: 11 } } },
        y: { grid: { color: "#eef1f6" }, border: { display: false }, ticks: { color: "#93a0b4", font: { size: 11 } } }
      }
    }, cfg.options || {});
    charts.push(new Chart(ctx, cfg));
  }
  function clearCharts() { while (charts.length) { try { charts.pop().destroy(); } catch (e) {} } }

  function draw() {
    clearCharts();
    const f = factor();
    const blue = "#2563eb", green = "#0f9d63";
    if (state.route === "overview") {
      const a = document.getElementById("cTrend");
      if (a) addChart(a, {
        type: "line",
        data: {
          labels: D.trend.labels,
          datasets: [
            { label: "销售额", data: D.trend.sales.map(v => v * f), borderColor: blue, backgroundColor: "rgba(37,99,235,.08)", fill: true, tension: .35, borderWidth: 2, pointRadius: 0 },
            { label: "毛利", data: D.trend.profit.map(v => v * f), borderColor: green, backgroundColor: "rgba(15,157,99,.06)", fill: true, tension: .35, borderWidth: 2, pointRadius: 0 }
          ]
        },
        options: {
          plugins: { legend: { display: true, position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: "#64748b", font: { size: 11 } } } },
          scales: { y: { ticks: { callback: v => "¥" + v / 1000 + "k" } } }
        }
      });
      const b = document.getElementById("cCash");
      if (b) addChart(b, {
        type: "bar",
        data: {
          labels: D.cashflow.labels,
          datasets: [
            { label: "收入", data: D.cashflow.income.map(v => v * f), backgroundColor: "#93b4f5", borderRadius: 5, barPercentage: .6 },
            { label: "支出", data: D.cashflow.expense.map(v => v * f), backgroundColor: "#e2e8f0", borderRadius: 5, barPercentage: .6 }
          ]
        },
        options: {
          plugins: { legend: { display: true, position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: "#64748b", font: { size: 11 } } } },
          scales: { y: { ticks: { callback: v => "¥" + v / 10000 + "万" } } }
        }
      });
    }
    if (state.route === "cash") {
      const el = document.getElementById("cFlow");
      if (el) addChart(el, {
        type: "bar",
        data: {
          labels: D.cashflow.labels,
          datasets: [
            { label: "收入", data: D.cashflow.income.map(v => v * f), backgroundColor: blue, borderRadius: 5, barPercentage: .62 },
            { label: "支出", data: D.cashflow.expense.map(v => v * f), backgroundColor: "#cbd5e1", borderRadius: 5, barPercentage: .62 }
          ]
        },
        options: {
          plugins: { legend: { display: true, position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: "#64748b", font: { size: 11 } } } },
          scales: { y: { ticks: { callback: v => "¥" + v / 10000 + "万" } } }
        }
      });
    }
    if (state.route === "sales") {
      const el = document.getElementById("cProfit");
      if (el) addChart(el, {
        type: "bar",
        data: {
          labels: D.sales.map(s => s.sku),
          datasets: [{ label: "毛利", data: D.sales.map(s => s.profit * f), backgroundColor: D.sales.map(s => s.profit >= 0 ? "#93b4f5" : "#f0a8a8"), borderRadius: 6, barPercentage: .55 }]
        },
        options: { scales: { y: { ticks: { callback: v => "¥" + v.toLocaleString() } } } }
      });
    }
  }

  /* ---------------- 路由 ---------------- */
  const views = { overview, todo: todoPage, cash, goods, sales, product, import: importer, master, account };

  function render() {
    const route = (location.hash.replace(/^#\//, "") || "overview").split("?")[0];
    state.route = views[route] ? route : "overview";
    document.getElementById("view").innerHTML = views[state.route]();
    document.querySelectorAll("#view table").forEach(t => {
      if (!t.parentElement.classList.contains("table-scroll")) {
        const w = document.createElement("div");
        w.className = "table-scroll";
        t.parentElement.insertBefore(w, t);
        w.appendChild(t);
      }
    });
    const t = titles[state.route];
    document.getElementById("pageTitle").textContent = t[0];
    document.getElementById("pageDesc").textContent = t[1];
    document.querySelectorAll(".nav-item").forEach(a => a.classList.toggle("active", a.dataset.route === state.route));
    window.scrollTo({ top: 0 });
    draw();
  }

  /* ---------------- 事件 ---------------- */
  window.addEventListener("hashchange", render);

  document.getElementById("fStore").addEventListener("change", e => { state.store = e.target.value; render(); });
  document.getElementById("fSite").addEventListener("change", e => { state.site = e.target.value; render(); });
  document.getElementById("fPeriod").addEventListener("change", e => { state.period = e.target.value; render(); });
  const btn = document.getElementById("btnCompare");
  btn.classList.add("on");
  btn.addEventListener("click", () => {
    state.compare = !state.compare;
    btn.classList.toggle("on", state.compare);
    btn.textContent = "对比上期：" + (state.compare ? "开" : "关");
    render();
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (el) {
      const act = el.dataset.act;
      if (act === "close") { closeForm(); return; }
      if (act === "tab") { state.masterTab = el.dataset.tab; render(); return; }
      if (act === "todo-filter") { state.todoFilter = el.dataset.level; render(); return; }
      if (act === "todo-done") {
        const i = Number(el.dataset.key);
        D.todos[i].status = "已处理";
        toast("已标记处理");
        render();
        return;
      }
      if (act === "edit") { openForm(el.dataset.entity, el.dataset.key === undefined ? null : Number(el.dataset.key)); return; }
      if (act === "del") {
        const entity = el.dataset.entity, idx = Number(el.dataset.key);
        const cfg = FORMS[entity];
        const coll = ["store", "sku", "warehouse", "subject"].includes(entity) ? D.masters[cfg.coll] : D[cfg.coll];
        if (confirm(`确定删除这条${cfg.title}记录？`)) {
          coll.splice(idx, 1);
          toast("已删除");
          render();
        }
        return;
      }
      if (act === "imp-type") { state.impType = el.dataset.type; render(); return; }
      if (act === "imp-step") {
        const s = Number(el.dataset.step);
        state.impStep = s;
        if (s === 4) toast("导入完成");
        render();
        return;
      }
      if (act === "toast") { toast(el.dataset.msg || "已操作"); return; }
    }
    if (e.target.matches("[data-filter]")) return;
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id === "entityForm") {
      e.preventDefault();
      if (!e.target.reportValidity()) return;
      saveForm(e.target);
    }
  });

  document.addEventListener("input", (e) => {
    if (!e.target.matches("[data-filter]")) return;
    const q = e.target.value.trim().toLowerCase();
    const card = e.target.closest(".card");
    card.querySelectorAll("tbody tr[data-row]").forEach(tr => {
      tr.style.display = !q || tr.innerText.toLowerCase().includes(q) ? "" : "none";
    });
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeForm(); });

  render();
})();
