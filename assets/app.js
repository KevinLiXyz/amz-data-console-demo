/* AMZ 数据台 · 交互原型（演示数据，无后端） v0.9 */
(function () {
  const D = window.DEMO;
  const DAY = 86400000;
  const ANCHOR = "2026-10-25"; // 演示数据的「今天」

  const money = (n) => {
    const v = Math.round(n);
    return (v < 0 ? "-¥" : "¥") + Math.abs(v).toLocaleString("en-US");
  };
  const money2 = (n) => (n < 0 ? "-¥" : "¥") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const pct = (n, d = 1) => (n > 0 ? "+" : "") + n.toFixed(d) + "%";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (d) => (d || "").slice(5);

  const PRESETS = [
    { k: "today", label: "今日", days: 1 },
    { k: "yesterday", label: "昨日", days: 1, offset: 1 },
    { k: "d3", label: "近 3 天", days: 3 },
    { k: "d7", label: "近 7 天", days: 7 },
    { k: "d14", label: "近 14 天", days: 14 },
    { k: "month", label: "本月", days: 25 },
    { k: "last", label: "上月", days: 30, offset: 25 },
    { k: "custom", label: "自定义", days: null }
  ];

  const state = {
    route: "overview",
    period: "month",
    from: "2026-10-01",
    to: ANCHOR,
    store: "全部店铺",
    site: "全部站点",
    compare: true,
    masterTab: "stores",
    todoFilter: "全部",
    purchaseStage: "全部",
    tracePos: "全部",
    purchaseTab: "list",
    impStep: 1,
    impType: "销售明细",
    adType: "全部",
    compareDim: "store",
    projStage: "全部",
    page: { sales: 1, goods: 1, ads: 1 },
    pageSize: 10,
    colMenu: false,
    cols: { age90: false, eta: true }
  };

  const shift = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);

  function range() {
    const p = PRESETS.find(x => x.k === state.period) || PRESETS[5];
    if (p.k === "custom") return { from: state.from, to: state.to };
    const end = shift(ANCHOR, -(p.offset || 0));
    return { from: shift(end, -(p.days - 1)), to: end };
  }
  function prevRange() {
    const r = range();
    const len = Math.round((Date.parse(r.to + "T00:00:00Z") - Date.parse(r.from + "T00:00:00Z")) / DAY) + 1;
    return { from: shift(r.from, -len), to: shift(r.from, -1) };
  }
  const inR = (d, r) => d >= r.from && d <= r.to;
  const storeOk = (r) => state.store === "全部店铺" || r.store === state.store;
  const siteOk = (r) => state.site === "全部站点" || r.site === state.site;

  function salesRows(r = range()) {
    return D.sales.filter(x => inR(x.date, r) && storeOk(x) && siteOk(x));
  }
  function adRows(r = range()) {
    return D.ads.filter(x => inR(x.date, r) && storeOk(x) && siteOk(x));
  }
  function sum(list, k) { return list.reduce((a, x) => a + (+x[k] || 0), 0); }

  function stats(r = range()) {
    const s = salesRows(r), a = adRows(r);
    const sales = sum(s, "amount"), refund = sum(s, "refund"), profit = sum(s, "profit"), qty = sum(s, "qty"), ad = sum(a, "spend");
    return { sales, refund, profit, qty, ad, margin: sales ? profit / sales * 100 : 0 };
  }
  const deltaOf = (cur, prev) => (prev ? (cur - prev) / Math.abs(prev) * 100 : 0);

  /* ---------------- 通用组件 ---------------- */
  const badge = (text, cls) => `<span class="badge ${cls}">${esc(text)}</span>`;
  const emptyRow = (cols, text = "没有数据") => `<tr><td colspan="${cols}" class="empty">${text}</td></tr>`;
  const actions = (entity, key) => `<div class="row-actions">
    <button class="link" data-act="edit" data-entity="${entity}" data-key="${key}">编辑</button>
    <button class="link danger" data-act="del" data-entity="${entity}" data-key="${key}">删除</button>
  </div>`;
  const cardHead = (title, sub, right = "") => `<div class="card-head"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}${right ? `<div class="right">${right}</div>` : ""}</div>`;
  const searchBox = (ph) => `<input class="search" data-filter placeholder="${ph}" />`;

  function kpiCard(k) {
    const tip = k.tip ? ` data-tip="${esc(k.tip)}"` : "";
    return `<div class="card kpi ${k.tip ? "has-tip" : ""}"${tip}>
      <div class="label">${k.label}${k.tip ? `<span class="tip-ico">?</span>` : ""}</div>
      <div class="value ${k.value < 0 ? "neg" : ""}">${k.fmt ? k.fmt(k.value) : money(k.value)}</div>
      <div class="foot">
        ${state.compare && k.delta != null ? `<span class="delta ${k.delta >= 0 ? "up" : "down"}">${pct(k.delta)}</span><span>较上期</span>` : `<span>本期</span>`}
        ${k.hint ? `<span class="muted">·</span><span>${k.hint}</span>` : ""}
      </div>
    </div>`;
  }

  function pager(key, total) {
    const size = state.pageSize;
    const pages = Math.max(1, Math.ceil(total / size));
    const p = Math.min(state.page[key] || 1, pages);
    return `<div class="pager">
      <span class="muted">共 ${total} 条 · 第 ${p}/${pages} 页</span>
      <button class="btn sm" data-act="page" data-page-key="${key}" data-page="${p - 1}" ${p <= 1 ? "disabled" : ""}>上一页</button>
      <button class="btn sm" data-act="page" data-page-key="${key}" data-page="${p + 1}" ${p >= pages ? "disabled" : ""}>下一页</button>
    </div>`;
  }
  const pageSlice = (key, list) => {
    const size = state.pageSize;
    const pages = Math.max(1, Math.ceil(list.length / size));
    const p = Math.min(state.page[key] || 1, pages);
    return list.slice((p - 1) * size, p * size);
  };

  function waterBar(fba, sales30) {
    const perDay = sales30 / 30;
    const days = perDay > 0 ? fba / perDay : 999;
    const pctW = Math.max(3, Math.min(100, Math.round(days / 60 * 100)));
    const cls = days >= 45 ? "ok" : days >= 20 ? "warn" : "bad";
    const txt = perDay > 0 ? `${Math.round(days)} 天` : "无销量";
    return `<div class="water ${cls}" data-tip="${esc(`FBA 可售 ${num(fba)} 件 · 30 天日均 ${(perDay).toFixed(1)} 件\n可售天数 = 可售 ÷ 日均（目标 45–60 天）`)}">
      <div class="water-top"><b>${num(fba)}</b><span>${txt}</span></div>
      <div class="water-bar"><i style="width:${pctW}%"></i></div>
    </div>`;
  }

  /* ---------------- 视图 ---------------- */
  function overview() {
    const r = range(), pr = prevRange();
    const cur = stats(r), prev = stats(pr);
    const fba = D.stock.reduce((a, s) => a + s.fba, 0);
    const todos = D.todos.filter(t => t.status !== "已处理").map(t => {
      const cls = t.level === "高" ? "high" : t.level === "中" ? "mid" : "low";
      return `<div class="todo-item"><span class="dot ${cls}"></span><div class="txt">${esc(t.text)}</div><div class="tm">${t.time}</div></div>`;
    }).join("");
    const transit = D.transit.map(t => `<tr data-row><td class="name">${esc(t.lane)}</td><td class="num">${num(t.qty)} 件</td>
      <td>${badge(t.status, t.status === "清关中" ? "amber" : t.status === "派送中" ? "blue" : "gray")}</td><td class="muted num">${t.eta}</td></tr>`).join("");
    const stockRows = D.stock.slice(0, 4).map(s => {
      const perDay = s.sales30 / 30;
      const days = perDay > 0 ? Math.round(s.fba / perDay) : 0;
      return `<tr data-row><td class="name">${esc(s.sku)}<div class="muted">${esc(s.name)}</div></td>
      <td>${esc(s.store)}</td><td>${s.site}</td><td class="num">${num(s.fba)}</td><td class="num">${days} 天</td>
      <td>${s.status === "健康" ? badge("健康", "green") : s.status === "已断货" ? badge("已断货", "red") : badge(s.status, "amber")}</td></tr>`;
    }).join("");

    const kpis = [
      { label: "销售额", value: cur.sales, delta: deltaOf(cur.sales, prev.sales), hint: `${num(cur.qty)} 件`, tip: `本期 ${num(cur.qty)} 件\n销售额 = 本币金额 × 汇率折算\n店铺：${state.store} · 站点：${state.site}` },
      { label: "预估毛利", value: cur.profit, delta: deltaOf(cur.profit, prev.profit), hint: `毛利率 ${cur.margin.toFixed(1)}%`, tip: `毛利 = 销售额 − 退款 − 采购 − 头程 − 仓储 − 佣金 − 配送 − 广告\n毛利率 ${cur.margin.toFixed(1)}%` },
      { label: "广告花费", value: cur.ad, delta: deltaOf(cur.ad, prev.ad), hint: `ACOS ${(cur.ad / (sum(adRows(r), "sales") || 1) * 100).toFixed(1)}%`, tip: `SP + SB + SD 合计\n广告销售额 ¥${num(sum(adRows(r), "sales"))}\nACOS = 花费 ÷ 广告销售额` },
      { label: "退款额", value: cur.refund, delta: deltaOf(cur.refund, prev.refund), hint: `退款率 ${(cur.refund / (cur.sales || 1) * 100).toFixed(1)}%`, tip: `退款率 = 退款额 ÷ 销售额` },
      { label: "应付账款", value: D.payables.reduce((a, p) => a + (p.amount - p.paid), 0), delta: null, hint: "3 笔待付 · 最近 10-28", tip: "按采购合同账期，不受期间筛选影响" }
    ];

    return `
      <div class="grid g5">${kpis.map(kpiCard).join("")}</div>
      <div class="grid g2">
        <div class="card">${cardHead("销售 / 毛利 / 广告花费", "按日", `<a class="btn ghost" href="#/sales">看明细</a>`)}
          <div class="chart-wrap"><canvas id="cTrend"></canvas></div>
          <div class="hint-row">鼠标移到图上可看当天明细</div></div>
        <div class="card">${cardHead("待办与异常提醒", `${D.todos.filter(t => t.status !== "已处理").length} 条`)}<div class="todo">${todos}</div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("资金收支", "收入 / 支出")}<div class="chart-wrap sm"><canvas id="cCash"></canvas></div></div>
        <div class="card">${cardHead("货物在途", "4 条航线", `<a class="btn ghost" href="#/goods">看库存</a>`)}
          <table class="table"><thead><tr><th>航线</th><th class="num">数量</th><th>状态</th><th class="num">预计到仓</th></tr></thead><tbody>${transit}</tbody></table></div>
      </div>
      <div class="card">${cardHead("FBA 库存快照", `可售 ${num(fba)} 件`, `<a class="btn ghost" href="#/goods">查看台账</a>`)}
        <table class="table"><thead><tr><th>SKU</th><th>店铺（公司）</th><th>站点</th><th class="num">FBA 可售</th><th class="num">可售天数</th><th>链路状态</th></tr></thead><tbody>${stockRows}</tbody></table></div>`;
  }

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
        <div class="card kpi"><div class="label">待处理</div><div class="value">${D.todos.filter(t => t.status !== "已处理").length}</div><div class="foot"><span>全部来源：导入 / 库存 / 应付 / 广告</span></div></div>
        <div class="card kpi"><div class="label">高优先级</div><div class="value neg">${counts["高"]}</div><div class="foot"><span>缺货、负库存、对账不平</span></div></div>
        <div class="card kpi"><div class="label">中优先级</div><div class="value">${counts["中"]}</div><div class="foot"><span>应付到期、广告超 ACOS</span></div></div>
        <div class="card kpi"><div class="label">低优先级</div><div class="value">${counts["低"]}</div><div class="foot"><span>导入失败行</span></div></div>
      </div>
      <div class="card">
        ${cardHead("待办列表", `${list.length} 条`)}
        <div class="toolbar"><div class="tabs">${levels.map(l => `<button class="tab ${filter === l ? "active" : ""}" data-act="todo-filter" data-level="${l}">${l}${l === "全部" ? ` <span class="cnt">${D.todos.length}</span>` : ` <span class="cnt">${counts[l] || 0}</span>`}</button>`).join("")}</div>
          <div class="right">${searchBox("搜索内容 / 模块")}</div></div>
        <table class="table"><thead><tr><th>级别</th><th>内容</th><th>关联模块</th><th>建议动作</th><th>时间</th><th>状态</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(7, "没有待办")}</tbody></table>
        <div class="hr"></div>
        <div class="note">待办由规则自动生成：FBA 断货或可售天数低于安全线、费用未分摊、应付到期前 7 天、广告 ACOS 超阈值、导入失败行。不使用消息推送，进系统即可看到。</div>
      </div>`;
  }

  /* ---------------- 采购 ---------------- */
  function purchase() {
    const tab = state.purchaseTab || "list";
    const bar = `<div class="tabs page-tabs">
      <button class="tab ${tab === "list" ? "active" : ""}" data-act="po-tab" data-tab="list">采购单</button>
      <button class="tab ${tab === "trace" ? "active" : ""}" data-act="po-tab" data-tab="trace">批次追踪</button>
    </div>`;
    return bar + (tab === "trace" ? traceBody() : purchaseBody());
  }

  function purchaseBody() {
    const stages = D.purchaseStages;
    const filter = state.purchaseStage || "全部";
    const counts = stages.map((st, i) => D.purchases.filter(p => p.stage === i).length);
    const list = D.purchases.map((p, i) => ({ p, i })).filter(({ p }) => filter === "全部" || stages[p.stage] === filter);
    const inTransit = D.purchases.filter(p => p.stage >= 3 && p.stage <= 6).length;
    const unpaid = D.purchases.reduce((a, p) => a + (p.amount - p.paid), 0);
    const toShip = D.purchases.filter(p => p.stage === 7).length;
    const shipped = D.purchases.filter(p => p.stage === 8).length;

    const rows = list.map(({ p, i }) => {
      const pctDone = Math.round((p.stage + 1) / stages.length * 100);
      return `<tr data-row>
        <td class="mono name">${p.no}<div class="muted">${p.batch || ""}</div></td>
        <td>${badge(p.type, p.type === "代加工" ? "blue" : "gray")}</td>
        <td>${esc(p.supplier)}</td>
        <td>${esc(p.sku)}<div class="muted">${esc(p.name)}</div></td>
        <td>${esc(p.store)}<div class="muted">${esc(p.site)}</div></td>
        <td>${p.site}</td>
        <td class="num">${num(p.qty)}</td>
        <td class="num">${money(p.amount)}</td>
        <td class="num">${p.paid >= p.amount ? badge("已付", "green") : p.paid > 0 ? badge("部分付", "amber") : badge("未付", "red")}</td>
        <td>${badge(stages[p.stage], p.stage >= 7 ? "green" : p.stage >= 5 ? "blue" : "amber")}</td>
        <td style="min-width:110px"><div class="progress"><i style="width:${pctDone}%"></i></div><div class="muted" style="font-size:11px">${p.stage + 1}/${stages.length}</div></td>
        <td class="num">${p.eta}</td>
        <td class="num nowrap">
          <button class="link" data-act="po-open" data-key="${i}">详情</button>
          ${p.stage < stages.length - 1 ? `<button class="link" data-act="po-next" data-key="${i}">推进</button>` : `<span class="muted">已完成</span>`}
          ${p.stage > 0 ? `<button class="link warn" data-act="po-prev" data-key="${i}">回退</button>` : ``}
        </td></tr>`;
    }).join("");

    const chips = `<div class="stage-strip">
      <button class="stage-chip ${filter === "全部" ? "on" : ""}" data-act="po-filter" data-stage="全部">全部 <b>${D.purchases.length}</b></button>
      ${stages.map((st, i) => `<button class="stage-chip ${filter === st ? "on" : ""}" data-act="po-filter" data-stage="${st}">${i + 1}. ${st} <b>${counts[i]}</b></button>`).join("")}
    </div>`;

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">在途批次</div><div class="value">${inTransit}</div><div class="foot"><span>供应商已发 → 未入库</span></div></div>
        <div class="card kpi"><div class="label">待付金额</div><div class="value ${unpaid > 0 ? "neg" : ""}">${money(unpaid)}</div><div class="foot"><span>按合同账期付款</span></div></div>
        <div class="card kpi"><div class="label">待出库发货</div><div class="value">${toShip}</div><div class="foot"><span>已入库未发走</span></div></div>
        <div class="card kpi"><div class="label">已发走批次</div><div class="value">${shipped}</div><div class="foot"><span>发 FBA</span></div></div>
      </div>

      <div class="card">
        ${cardHead("采购推进", "点阶段筛选", `<button class="btn" data-act="tab-master" data-tab="suppliers">供应商维护</button><button class="btn primary" data-act="edit" data-entity="purchase">＋ 新建采购单</button>`)}
        ${chips}
        <table class="table wide"><thead><tr><th>采购单</th><th>类型</th><th>供应商</th><th>SKU</th><th>店铺（公司）</th><th>站点</th><th class="num">数量</th><th class="num">金额</th><th>付款</th><th>当前阶段</th><th>进度</th><th class="num">预计到仓</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(13, "当前阶段没有采购单")}</tbody></table>
        <div class="hr"></div>
        <div class="note">流程（货物线）：采购申请 → 审批 → 下单 → 供应商发货 → 头程运输 → 清关 → 到仓 → 入库上架 → 出库发货。付款是并行的「钱线」，不占阶段。进度只能一步步推进，误点可用「回退」撤回一步并留痕。</div>
      </div>`;
  }

  function traceBody() {
    const NOW = new Date("2026-10-25T11:40:00");
    const posOf = (stage) => ({
      "采购申请": "供应商/工厂", "审批": "内部", "下单": "供应商/工厂",
      "供应商发货": "工厂 → 港口", "头程运输": "海上/在途", "清关": "目的港",
      "到仓": "FBA 仓（待上架）", "入库上架": "FBA 仓（可售）", "出库发货": "已发 FBA"
    })[stage] || "—";
    const daysIn = (p) => {
      const last = p.timeline[p.timeline.length - 1];
      if (!last) return 0;
      const t = new Date(last.time.replace(" ", "T"));
      if (isNaN(t)) return 0;
      return Math.max(0, Math.floor((NOW - t) / DAY));
    };
    const rowsData = D.purchases.map((p, i) => {
      const stage = D.purchaseStages[p.stage];
      const days = daysIn(p);
      const next = p.stage < D.purchaseStages.length - 1 ? D.purchaseStages[p.stage + 1] : "已完成";
      return { p, i, stage, days, next, pos: posOf(stage), warn: days >= 3 && p.stage < 8 };
    });
    const filter = state.tracePos || "全部";
    const positions = ["全部", "供应商/工厂", "海上/在途", "目的港", "FBA 仓（待上架）", "FBA 仓（可售）", "已发 FBA"];
    const list = rowsData.filter(r => filter === "全部" || r.pos === filter);

    const rows = list.map(({ p, i, stage, days, next, pos, warn }) => `<tr data-row class="${warn ? "warn-row" : ""}">
      <td class="mono name">${p.batch || "—"}</td>
      <td>${p.no}</td>
      <td>${esc(p.sku)}<div class="muted">${esc(p.name)}</div></td>
      <td>${esc(p.store)}<div class="muted">${p.site}</div></td>
      <td class="num">${num(p.qty)}</td>
      <td>${badge(stage, p.stage >= 8 ? "green" : p.stage >= 5 ? "blue" : "amber")}</td>
      <td>${pos}</td>
      <td class="num">${days > 0 ? `${days} 天` : "今天"}${warn ? ` <span class="badge amber">停留偏久</span>` : ""}</td>
      <td>${next}</td>
      <td class="num">${p.eta}</td>
      <td class="num"><button class="link" data-act="po-open" data-key="${i}">时间轴</button></td>
    </tr>`).join("");

    const warnCount = rowsData.filter(r => r.warn).length;

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">在跟批次</div><div class="value">${rowsData.filter(r => r.p.stage < 8).length}</div><div class="foot"><span>未发走的货</span></div></div>
        <div class="card kpi"><div class="label">已发走</div><div class="value">${rowsData.filter(r => r.p.stage === 8).length}</div><div class="foot"><span>发 FBA</span></div></div>
        <div class="card kpi"><div class="label">停留偏久</div><div class="value ${warnCount ? "neg" : ""}">${warnCount}</div><div class="foot"><span>同一节点 ≥ 3 天</span></div></div>
        <div class="card kpi"><div class="label">在途件数</div><div class="value">${num(rowsData.filter(r => [4, 5].includes(r.p.stage)).reduce((a, r) => a + r.p.qty, 0))}</div><div class="foot"><span>海上 + 清关</span></div></div>
      </div>

      <div class="card">
        ${cardHead("货在哪", "按批次看当前位置", `<span class="muted" style="font-size:12px">数据截至 2026-10-25 11:40</span>`)}
        <div class="stage-strip">${positions.map(pos => `<button class="stage-chip ${filter === pos ? "on" : ""}" data-act="trace-filter" data-pos="${pos}">${pos}${pos === "全部" ? ` <b>${rowsData.length}</b>` : ` <b>${rowsData.filter(r => r.pos === pos).length}</b>`}</button>`).join("")}</div>
        <table class="table"><thead><tr><th>批次号</th><th>采购单</th><th>SKU</th><th>店铺 / 站点</th><th class="num">数量</th><th>当前状态</th><th>当前位置</th><th class="num">已停留</th><th>下一步</th><th class="num">预计到仓</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(11, "这个位置没有货")}</tbody></table>
        <div class="hr"></div>
        <div class="note">一个批次 = 一次采购的数量，从建单到发走都不拆开。停留超过 3 天自动进待办；出库发货后批次记为已发走，FBA 库存相应增加。</div>
      </div>`;
  }

  function openPurchase(i) {
    const p = D.purchases[i];
    const stages = D.purchaseStages;
    const tl = p.timeline.map((t, idx) => `<li class="tl-item ${idx === p.timeline.length - 1 ? "last" : ""}">
      <span class="tl-dot"></span>
      <div class="tl-body"><b>${esc(t.stage)}</b><span class="muted">${t.time} · ${esc(t.by)}</span><div class="tl-note">${esc(t.note)}</div></div>
    </li>`).join("");

    drawerRoot().innerHTML = `
      <div class="drawer-mask" data-act="close"></div>
      <aside class="drawer">
        <header><div><h3>${p.no}</h3><div class="muted" style="font-size:12px">${p.supplier} · ${p.sku} ${p.name}</div></div>
          <button class="x" data-act="close">×</button></header>
        <div class="form-body">
          <div class="grid g2e" style="gap:10px">
            <div class="kv"><span>采购数量</span><b>${num(p.qty)} 件</b></div>
            <div class="kv"><span>采购金额</span><b>${money(p.amount)}</b></div>
            <div class="kv"><span>已付金额</span><b>${money(p.paid)}</b></div>
            <div class="kv"><span>预计到仓</span><b>${p.eta}</b></div>
            <div class="kv"><span>当前阶段</span><b>${stages[p.stage]}</b></div>
            <div class="kv"><span>采购类型</span><b>${p.type || "—"}</b></div>
            <div class="kv"><span>店铺（公司）</span><b>${p.store}</b></div>
            <div class="kv"><span>站点</span><b>${p.site}</b></div>
            <div class="kv"><span>批次号</span><b>${p.batch || "—"}</b></div>
            <div class="kv"><span>负责人</span><b>${p.owner}</b></div>
          </div>
          <div class="hr"></div>
          <div class="tl">${tl}</div>
        </div>
        <footer>
          <button type="button" class="btn" data-act="close">关闭</button>
          ${p.stage > 0 ? `<button type="button" class="btn warn" data-act="po-prev" data-key="${i}">回退一步</button>` : ``}
          ${p.stage < stages.length - 1 ? `<button type="button" class="btn primary" data-act="po-next" data-key="${i}">推进到「${stages[p.stage + 1]}」</button>` : `<button class="btn" disabled>已发走</button>`}
        </footer>
      </aside>`;
    document.body.classList.add("locked");
  }

  /* ---------------- 资金 ---------------- */
  function cash() {
    const r = range(), pr = prevRange();
    const balance = D.accounts.reduce((s, a) => s + a.balance, 0);
    const list = D.finance.filter(f => inR(f.date, r));
    const prevList = D.finance.filter(f => inR(f.date, pr));
    const income = list.filter(f => f.amount > 0).reduce((a, f) => a + f.amount, 0);
    const expense = Math.abs(list.filter(f => f.amount < 0).reduce((a, f) => a + f.amount, 0));
    const pIncome = prevList.filter(f => f.amount > 0).reduce((a, f) => a + f.amount, 0);
    const pExpense = Math.abs(prevList.filter(f => f.amount < 0).reduce((a, f) => a + f.amount, 0));

    const rows = list.map((r2) => `<tr data-row>
      <td class="muted">${r2.date}</td><td>${badge(r2.type, r2.type === "收入" ? "green" : "gray")}</td>
      <td>${esc(r2.account)}</td><td>${esc(r2.category)}</td><td>${esc(r2.counterparty)}</td>
      <td class="num">${money(r2.amount)}</td><td class="muted">${esc(r2.note)}</td>
      <td class="num">${actions("finance", D.finance.indexOf(r2))}</td></tr>`).join("");
    const payables = D.payables.map(p => `<tr data-row><td class="name">${p.no}</td><td>${p.supplier}</td>
      <td class="num">${money(p.amount)}</td><td class="num">${money(p.paid)}</td><td class="num">${money(p.amount - p.paid)}</td><td class="num">${p.due}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">账户余额合计</div><div class="value">${money(balance)}</div><div class="foot"><span>3 个账户 · 不随期间变化</span></div></div>
        <div class="card kpi"><div class="label">本期收入</div><div class="value">${money(income)}</div><div class="foot"><span class="delta ${deltaOf(income, pIncome) >= 0 ? "up" : "down"}">${pct(deltaOf(income, pIncome))}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">本期支出</div><div class="value">${money(expense)}</div><div class="foot"><span class="delta ${deltaOf(expense, pExpense) <= 0 ? "up" : "down"}">${pct(deltaOf(expense, pExpense))}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">净现金流</div><div class="value ${income - expense < 0 ? "neg" : ""}">${money(income - expense)}</div><div class="foot"><span>含在途应付 ${money(D.payables.reduce((a, p) => a + p.amount - p.paid, 0))}</span></div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("收支趋势", "按期间汇总")}<div class="chart-wrap"><canvas id="cFlow"></canvas></div></div>
        <div class="card">${cardHead("账户余额", "按账户")}
          <div class="mini-list">${D.accounts.map(a => {
            const w = Math.max(6, Math.round(a.balance / (balance || 1) * 100));
            return `<div class="mini-row"><div class="k">${a.name}</div><div class="bar"><i style="width:${w}%"></i></div><div class="v">${money(a.balance)}</div></div>`;
          }).join("")}</div>
          <div class="hr"></div>
          <div class="note">费用分摊：头程与 FBA 仓储费按采购数量分摊到 SKU；未分摊金额 ¥0。账户余额为当前时点快照。</div></div>
      </div>
      <div class="card">${cardHead("收支明细", `共 ${list.length} 条`, `${searchBox("搜索对方单位 / 科目")}<button class="btn" data-act="toast" data-msg="筛选面板：日期 / 类型 / 科目 / 账户（演示）">筛选</button><button class="btn primary" data-act="edit" data-entity="finance">＋ 登记流水</button>`)}
        <table class="table"><thead><tr><th>日期</th><th>类型</th><th>账户</th><th>科目</th><th>对方单位</th><th class="num">金额</th><th>备注</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(8, "所选期间没有流水")}</tbody></table></div>
      <div class="card">${cardHead("应付账款", "采购未付与物流费", badge("3 笔待付 · 最近 10-28 到期", "amber"))}
        <table class="table"><thead><tr><th>采购单号</th><th>供应商</th><th class="num">金额</th><th class="num">已付</th><th class="num">未付</th><th class="num">到期日</th></tr></thead>
        <tbody>${payables}</tbody></table></div>`;
  }

  /* ---------------- 库存（FBA） ---------------- */
  function goods() {
    const list = D.stock.filter(s => storeOk(s) && siteOk(s));
    const totalFba = list.reduce((a, s) => a + s.fba, 0);
    const totalInbound = list.reduce((a, s) => a + s.inbound, 0);
    const transitQty = D.transit.reduce((a, t) => a + t.qty, 0);
    const risk = list.filter(s => s.status === "断货风险" || s.status === "已断货").length;
    const suggestCount = list.filter(s => suggestOf(s) > 0).length;
    const showAge = state.cols.age90, showEta = state.cols.eta;
    const headCols = 11 + (showAge ? 1 : 0) + (showEta ? 1 : 0);

    const rows = pageSlice("goods", list).map((s, i) => {
      const perDay = s.sales30 / 30;
      const days = perDay > 0 ? Math.round(s.fba / perDay) : 0;
      const sug = suggestOf(s);
      return `<tr data-row>
        <td class="name">${esc(s.sku)}<div class="muted">${esc(s.asin)}</div></td>
        <td>${esc(s.name)}<div class="muted">${esc(s.store)}</div></td>
        <td>${s.site}</td>
        <td>${waterBar(s.fba, s.sales30)}</td>
        <td class="num">${s.domestic ? num(s.domestic) : "—"}</td>
        <td class="num">${s.inbound ? num(s.inbound) : "—"}</td>
        <td class="num">${num(s.sales30)}</td>
        <td class="num">${days ? days + " 天" : "—"}</td>
        <td class="num">${sug > 0 ? `<b class="brand-txt">${num(sug)}</b>` : "—"}</td>
        ${showAge ? `<td class="num">${s.age90 ? `<span class="badge amber">${num(s.age90)}</span>` : "—"}</td>` : ""}
        ${showEta ? `<td class="num">${s.eta}</td>` : ""}
        <td>${s.status === "健康" ? badge("健康", "green") : s.status === "已断货" ? badge("已断货", "red") : badge(s.status, "amber")}</td>
        <td class="num"><button class="link" data-act="toast" data-msg="已按建议补货量生成采购申请（演示）">去采购</button></td>
      </tr>`;
    }).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">FBA 可售库存</div><div class="value">${num(totalFba)}</div><div class="foot"><span>${list.length} 个 SKU · ${new Set(list.map(s => s.site)).size} 个站点</span></div></div>
        <div class="card kpi"><div class="label">在途件数</div><div class="value">${num(transitQty + totalInbound)}</div><div class="foot"><span>国内运输 ${num(totalInbound)} + 头程 ${num(transitQty)}</span></div></div>
        <div class="card kpi"><div class="label">断货 / 断货风险</div><div class="value ${risk ? "neg" : ""}">${risk}</div><div class="foot"><span>可售天数低于 20 天</span></div></div>
        <div class="card kpi"><div class="label">建议补货 SKU</div><div class="value">${suggestCount}</div><div class="foot"><span>按 45 天安全库存测算</span></div></div>
      </div>

      <div class="grid g2">
        <div class="card">${cardHead("在途与到仓", "按航线")}
          <table class="table"><thead><tr><th>航线</th><th class="num">数量</th><th>状态</th><th class="num">预计到仓</th></tr></thead><tbody>
          ${D.transit.map(t => `<tr data-row><td class="name">${esc(t.lane)}</td><td class="num">${num(t.qty)} 件</td>
          <td>${badge(t.status, t.status === "清关中" ? "amber" : t.status === "派送中" ? "blue" : "gray")}</td><td class="num">${t.eta}</td></tr>`).join("")}
          </tbody></table></div>
        <div class="card">${cardHead("FBA 库龄分布", "按件数")}
          <div class="mini-list">
            <div class="mini-row"><div class="k">0–90 天</div><div class="bar"><i style="width:88%"></i></div><div class="v">${num(totalFba - list.reduce((a, s) => a + s.age90, 0))}</div></div>
            <div class="mini-row"><div class="k">&gt; 90 天</div><div class="bar"><i style="width:8%"></i></div><div class="v">${num(list.reduce((a, s) => a + s.age90, 0))}</div></div>
            <div class="mini-row"><div class="k">&gt; 180 天</div><div class="bar"><i style="width:2%"></i></div><div class="v">0</div></div>
          </div>
          <div class="hr"></div><div class="note">做的是 FBA 仓模式，不做海外仓。补货规则：可售天数低于 45 天触发建议补货，数量 = 45 天销量 − FBA 可售 − 在途。</div></div>
      </div>

      <div class="card">
        ${cardHead("FBA 库存与补货", `${list.length} 个 SKU`, `
          ${searchBox("搜索 SKU / 名称 / ASIN")}
          <details class="col-menu"><summary class="btn">列设置</summary>
            <div class="menu">
              <label><input type="checkbox" data-col="age90" ${showAge ? "checked" : ""}/> 库龄 &gt; 90 天</label>
              <label><input type="checkbox" data-col="eta" ${showEta ? "checked" : ""}/> FBA 最早入仓</label>
            </div>
          </details>
          <button class="btn" data-act="toast" data-msg="已下载导入模板（演示）">下载模板</button>
          <button class="btn primary" data-act="toast" data-msg="新增库存数据：日期 / SKU / 店铺 / 站点 / 可售 / 在途（演示）">＋ 新增库存数据</button>`)}
        <table class="table"><thead><tr><th>SKU / ASIN</th><th>品名 / 店铺</th><th>站点</th><th>库存水位</th><th class="num">国内运输中</th><th class="num">FBA 在途</th><th class="num">30 天销量</th><th class="num">可售天数</th><th class="num">建议补货</th>${showAge ? `<th class="num">库龄 &gt; 90 天</th>` : ""}${showEta ? `<th class="num">FBA 最早入仓</th>` : ""}<th>链路状态</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(headCols, "当前筛选下没有数据")}</tbody></table>
        ${pager("goods", list.length)}
        <div class="hr"></div>
        <div class="note">库存水位：绿色 ≥ 45 天、琥珀 20–44 天、红色 &lt; 20 天（按 30 天日均销量折算）。国内运输中 = 已发货未到仓；FBA 在途 = 已发 FBA 未上架。</div>
      </div>`;
  }

  function suggestOf(s) {
    const perDay = s.sales30 / 30;
    return Math.max(0, Math.round(perDay * 45 - s.fba - s.inbound));
  }

  /* ---------------- 销售 ---------------- */
  function sales() {
    const r = range(), pr = prevRange();
    const cur = stats(r), prev = stats(pr);
    const list = salesRows(r).slice().sort((a, b) => b.date.localeCompare(a.date));
    const total = list.length;

    const rows = pageSlice("sales", list).map((s, i) => {
      return `<tr data-row>
        <td class="muted nowrap">${s.date}</td>
        <td>${esc(s.store)}</td>
        <td>${s.site}</td>
        <td class="name">${esc(s.sku)}<div class="muted">${esc(s.name)}</div></td>
        <td class="mono muted">${esc(s.asin)}</td>
        <td>${s.currency}</td>
        <td class="num">${num(s.qty)}</td>
        <td class="num">${s.amountLocal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="num">${money(s.amount)}</td>
        <td class="num">${money(s.refund)}</td>
        <td class="num">${money(s.ad)}</td>
        <td class="num"><b>${money(s.profit)}</b></td>
        <td class="num">${badge(s.margin.toFixed(1) + "%", s.margin >= 20 ? "green" : s.margin >= 12 ? "amber" : "red")}</td>
        <td class="num">${actions("sales", D.sales.indexOf(s))}</td>
      </tr>`;
    }).join("");

    const dims = [["store", "按店铺（公司）"], ["site", "按站点（销售国）"]];
    const a = salesRows(r), b = salesRows(pr);
    const groups = [...new Set(a.map(x => x[state.compareDim]))];
    const cmp = groups.map(g => {
      const cu = a.filter(x => x[state.compareDim] === g).reduce((s, x) => s + x.amount, 0);
      const pv = b.filter(x => x[state.compareDim] === g).reduce((s, x) => s + x.amount, 0);
      return { g, cu, pv, d: deltaOf(cu, pv) };
    }).sort((x, y) => y.cu - x.cu);
    const cmpTot = cmp.reduce((s, x) => ({ cu: s.cu + x.cu, pv: s.pv + x.pv }), { cu: 0, pv: 0 });

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">销售额</div><div class="value">${money(cur.sales)}</div><div class="foot"><span class="delta ${deltaOf(cur.sales, prev.sales) >= 0 ? "up" : "down"}">${pct(deltaOf(cur.sales, prev.sales))}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">销量</div><div class="value">${num(cur.qty)} 件</div><div class="foot"><span class="delta ${deltaOf(cur.qty, prev.qty) >= 0 ? "up" : "down"}">${pct(deltaOf(cur.qty, prev.qty))}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">广告花费</div><div class="value">${money(cur.ad)}</div><div class="foot"><span>占销售额 ${(cur.ad / (cur.sales || 1) * 100).toFixed(1)}%</span></div></div>
        <div class="card kpi"><div class="label">毛利</div><div class="value ${cur.profit < 0 ? "neg" : ""}">${money(cur.profit)}</div><div class="foot"><span>毛利率 ${cur.margin.toFixed(1)}%</span></div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("SKU 销售额 / 销量 / 广告花费", "本期")}<div class="chart-wrap"><canvas id="cSkuMix"></canvas></div></div>
        <div class="card">${cardHead("多维对比", "本期 vs 上期", `<div class="tabs">${dims.map(([k, n]) => `<button class="tab ${state.compareDim === k ? "active" : ""}" data-act="cmp-dim" data-dim="${k}">${n}</button>`).join("")}</div>`)}
          <table class="table"><thead><tr><th>${state.compareDim === "store" ? "店铺（公司）" : "站点（销售国）"}</th><th class="num">上期</th><th class="num">本期</th><th class="num">环比</th></tr></thead><tbody>
            ${cmp.map(x => `<tr data-row><td class="name">${esc(x.g)}</td><td class="num">${money(x.pv)}</td><td class="num">${money(x.cu)}</td><td class="num">${badge(pct(x.d), x.d >= 0 ? "green" : "red")}</td></tr>`).join("")}
            <tr data-row><td class="name"><b>合计</b></td><td class="num"><b>${money(cmpTot.pv)}</b></td><td class="num"><b>${money(cmpTot.cu)}</b></td><td class="num">${badge(pct(deltaOf(cmpTot.cu, cmpTot.pv)), cmpTot.cu >= cmpTot.pv ? "green" : "red")}</td></tr>
          </tbody></table>
          <div class="hr"></div>
          <div class="muted" style="font-size:12px">口径：毛利 = 销售额 − 退款 − 采购成本 − 头程 − 仓储 − 平台佣金 − 平台配送费 − 广告；汇率按人工维护的静态表。</div></div>
      </div>
      <div class="card">${cardHead("销售明细", `共 ${total} 条 · 每天录入`, `${searchBox("搜索 SKU / ASIN / 店铺")}<button class="btn" data-act="toast" data-msg="导出当前筛选结果（演示）">导出</button><button class="btn primary" data-act="edit" data-entity="sales">＋ 录入当日数据</button>`)}
        <table class="table wide"><thead><tr><th>日期</th><th>店铺（公司）</th><th>站点</th><th>SKU</th><th>ASIN</th><th>币种</th><th class="num">销量</th><th class="num">本币销售额</th><th class="num">销售额(¥)</th><th class="num">退款(¥)</th><th class="num">广告(¥)</th><th class="num">毛利</th><th class="num">毛利率</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(14, "当前筛选下没有数据")}</tbody></table>
        ${pager("sales", total)}
        <div class="hr"></div>
        <div class="note">录入按「日期 × 店铺 × 站点 × SKU」一条，金额用站点本币录入，系统按汇率表折算人民币；数据量大，默认每页 10 条。</div></div>`;
  }

  /* ---------------- 广告运营 ---------------- */
  function ads() {
    const r = range(), pr = prevRange();
    const rowsAll = adRows(r);
    const list = state.adType === "全部" ? rowsAll : rowsAll.filter(x => x.type === state.adType);
    const spend = sum(list, "spend"), gmv = sum(list, "sales"), clicks = sum(list, "clicks"), imp = sum(list, "impressions"), orders = sum(list, "orders");
    const prevRows = adRows(pr).filter(x => state.adType === "全部" || x.type === state.adType);
    const pSpend = sum(prevRows, "spend"), pGmv = sum(prevRows, "sales");
    const ctr = imp ? clicks / imp * 100 : 0;
    const cpc = clicks ? spend / clicks : 0;
    const acos = gmv ? spend / gmv * 100 : 0;
    const roas = spend ? gmv / spend : 0;

    const byKey = {};
    list.forEach(x => {
      const k = [x.campaign, x.type, x.store, x.site, x.sku].join("|");
      if (!byKey[k]) byKey[k] = { ...x, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
      byKey[k].impressions += x.impressions; byKey[k].clicks += x.clicks;
      byKey[k].spend += x.spend; byKey[k].sales += x.sales; byKey[k].orders += x.orders;
    });
    const camps = Object.values(byKey).sort((a, b) => b.spend - a.spend);
    const rows = pageSlice("ads", camps).map(c => {
      const cAcos = c.sales ? c.spend / c.sales * 100 : 0;
      const cCtr = c.impressions ? c.clicks / c.impressions * 100 : 0;
      const cCpc = c.clicks ? c.spend / c.clicks : 0;
      return `<tr data-row>
        <td class="name">${esc(c.campaign)}<div class="muted">${c.type}</div></td>
        <td>${badge(c.type === "SP" ? "商品推广" : c.type === "SB" ? "品牌推广" : "展示推广", c.type === "SP" ? "blue" : c.type === "SB" ? "green" : "amber")}</td>
        <td>${esc(c.store)}</td>
        <td>${c.site}</td>
        <td class="mono">${esc(c.sku)}</td>
        <td class="num">${num(c.impressions)}</td>
        <td class="num">${num(c.clicks)}</td>
        <td class="num">${cCtr.toFixed(2)}%</td>
        <td class="num">${money2(cCpc)}</td>
        <td class="num">${money(c.spend)}</td>
        <td class="num">${money(c.sales)}</td>
        <td class="num">${badge(cAcos.toFixed(1) + "%", cAcos <= 25 ? "green" : cAcos <= 40 ? "amber" : "red")}</td>
        <td class="num">${num(c.orders)}</td>
      </tr>`;
    }).join("");

    const tabs = [["全部", "全部"], ["SP", "商品推广 SP"], ["SB", "品牌推广 SB"], ["SD", "展示推广 SD"]];
    const types = ["SP", "SB", "SD"].map(t => ({
      t, spend: sum(rowsAll.filter(x => x.type === t), "spend"), sales: sum(rowsAll.filter(x => x.type === t), "sales")
    }));

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">广告花费</div><div class="value">${money(spend)}</div><div class="foot"><span class="delta ${deltaOf(spend, pSpend) >= 0 ? "up" : "down"}">${pct(deltaOf(spend, pSpend))}</span><span>较上期</span></div>
          </div>
        <div class="card kpi"><div class="label">广告销售额</div><div class="value">${money(gmv)}</div><div class="foot"><span>占整体销售 ${(gmv / (stats(r).sales || 1) * 100).toFixed(0)}%</span></div></div>
        <div class="card kpi"><div class="label">ACOS</div><div class="value">${acos.toFixed(1)}%</div><div class="foot"><span>目标 ≤ 25%</span></div></div>
        <div class="card kpi"><div class="label">ROAS</div><div class="value">${roas.toFixed(2)}</div><div class="foot"><span>每花 1 元带回 ${roas.toFixed(2)} 元</span></div></div>
      </div>
      <div class="grid g2">
        <div class="card">${cardHead("广告花费趋势", "SP / SB / SD", `<span class="muted" style="font-size:12px">按日汇总</span>`)}<div class="chart-wrap"><canvas id="cAds"></canvas></div></div>
        <div class="card">${cardHead("广告类型占比", "本期")}
          <div class="mini-list">
            ${types.map(t => `<div class="mini-row"><div class="k">${t.t} · ${t.t === "SP" ? "商品推广" : t.t === "SB" ? "品牌推广" : "展示推广"}</div><div class="bar"><i style="width:${Math.round(t.spend / (spend || 1) * 100)}%"></i></div><div class="v">${money(t.spend)}</div></div>`).join("")}
          </div>
          <div class="hr"></div>
          <div class="mini-list">
            <div class="mini-row"><div class="k">曝光</div><div class="v">${num(imp)}</div></div>
            <div class="mini-row"><div class="k">点击 / CTR</div><div class="v">${num(clicks)} · ${ctr.toFixed(2)}%</div></div>
            <div class="mini-row"><div class="k">CPC</div><div class="v">${money2(cpc)}</div></div>
            <div class="mini-row"><div class="k">订单</div><div class="v">${num(orders)}</div></div>
          </div></div>
      </div>
      <div class="card">
        ${cardHead("活动列表", `${camps.length} 个活动 · 按 店铺 × 站点 × SKU 归集`, `<button class="btn" data-act="toast" data-msg="已下载广告模板（演示）">下载模板</button><button class="btn primary" data-act="edit" data-entity="ads">＋ 新增广告数据</button>`)}
        <div class="toolbar"><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${state.adType === k ? "active" : ""}" data-act="ad-type" data-type="${k}">${n}</button>`).join("")}</div>
          <div class="right">${searchBox("搜索活动 / SKU")}</div></div>
        <table class="table wide"><thead><tr><th>活动</th><th>类型</th><th>店铺（公司）</th><th>站点</th><th>SKU</th><th class="num">曝光</th><th class="num">点击</th><th class="num">CTR</th><th class="num">CPC</th><th class="num">花费</th><th class="num">广告销售额</th><th class="num">ACOS</th><th class="num">订单</th></tr></thead>
        <tbody>${rows || emptyRow(13, "当前筛选下没有广告数据")}</tbody></table>
        ${pager("ads", camps.length)}
        <div class="hr"></div>
        <div class="note">广告数据每天按「日期 × 店铺 × 站点 × SKU × 广告类型」录入或导入，汇总后回写销售页的广告花费与毛利，也进首页与待办（ACOS 超阈值）。</div>
      </div>`;
  }

  /* ---------------- 产品开发 ---------------- */
  function product() {
    const stages = D.projectStages;
    const filter = state.projStage;
    const list = D.projects.filter(p => filter === "全部" || p.stage === filter);
    const counts = stages.map(s => D.projects.filter(p => p.stage === s).length);

    const stepBar = (p) => `<div class="steps-flow" data-tip="${esc(`当前阶段：${p.stage}\n已完成 ${p.step} / ${stages.length - 1} 个节点`)}">
      ${stages.map((s, i) => `<span class="sf ${i <= p.step ? "done" : ""} ${i === p.step ? "now" : ""}" title="${s}"><i></i><em>${s}</em></span>`).join("")}
    </div>`;

    const rows = list.map((p, i) => `<tr data-row>
      <td class="name">${esc(p.code)}<div class="muted">${esc(p.name)}</div></td>
      <td>${badge(p.stage, p.stage === "上市" ? "green" : p.stage === "量产" ? "blue" : p.stage === "打样" ? "amber" : "gray")}</td>
      <td>${esc(p.owner)}</td><td class="num">${money(p.cost)}</td><td class="num">${p.target}</td>
      <td style="min-width:260px">${stepBar(p)}</td>
      <td class="num">${actions("project", i)}</td></tr>`).join("");

    return `
      <div class="grid g4">
        ${stages.map((s, i) => `<div class="card kpi"><div class="label">${s}</div><div class="value">${counts[i]}</div><div class="foot"><span>${i === 0 ? "立项评估中" : i === 1 ? "打样/开模中" : i === 2 ? "备货量产中" : "已上架在售"}</span></div></div>`).join("")}
      </div>
      <div class="card">${cardHead("项目台账", `${D.projects.length} 个项目`, `<button class="btn primary" data-act="edit" data-entity="project">＋ 新建项目</button>`)}
        <div class="stage-strip">
          <button class="stage-chip ${filter === "全部" ? "on" : ""}" data-act="proj-filter" data-stage="全部">全部 <b>${D.projects.length}</b></button>
          ${stages.map((s, i) => `<button class="stage-chip ${filter === s ? "on" : ""}" data-act="proj-filter" data-stage="${s}">${s} <b>${counts[i]}</b></button>`).join("")}
        </div>
        <table class="table"><thead><tr><th>项目</th><th>阶段</th><th>负责人</th><th class="num">已投入</th><th class="num">目标上市</th><th>流程进度</th><th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(7)}</tbody></table>
        <div class="hr"></div>
        <div class="note">流程固定四步：选品评估 → 打样 → 量产 → 上市。已完成的节点变蓝，未开始的为灰条；进度不再用百分比。</div>
      </div>`;
  }

  /* ---------------- 基础档案 ---------------- */
  function master() {
    const tabs = [["stores", "店铺（公司）"], ["sites", "站点"], ["skuProfit", "SKU 利润表"], ["suppliers", "供应商"]];
    const tab = state.masterTab;
    let cols = [], rows = "", entity = "store", note = "";

    if (tab === "stores") {
      cols = ["公司名称", "默认站点", "状态", "更新时间"];
      rows = D.stores.map((r, i) => `<tr data-row>
        <td class="name">${esc(r.name)}</td><td>${esc(r.site)}</td>
        <td>${badge(r.status, r.status === "启用" ? "green" : "gray")}</td>
        <td class="muted">${r.updated || "—"}</td>
        <td class="num">${actions("store", i)}</td></tr>`).join("");
      entity = "store";
      note = "店铺 = 公司名称，可自由新增多家公司；一家公司可以有多个站点，站点在「站点」页维护。";
    } else if (tab === "sites") {
      cols = ["销售国", "结算币种", "状态"];
      rows = D.sites.map((r, i) => `<tr data-row>
        <td class="name">${esc(r.name)}</td><td>${esc(r.currency)}</td>
        <td>${badge(r.status, r.status === "启用" ? "green" : "gray")}</td>
        <td class="num">${actions("site", i)}</td></tr>`).join("");
      entity = "site";
      note = "站点 = 销售国，可后台自定义（美国、加拿大、巴西、墨西哥、德国、英国…），币种用于本币录入折算。";
    } else if (tab === "skuProfit") {
      cols = ["SKU", "产品名称", "售价(¥)", "采购成本", "头程", "仓储", "平台佣金", "配送费", "广告分摊", "单件毛利", "毛利率", "更新日期"];
      rows = D.skuProfit.map((r, i) => `<tr data-row>
        <td class="name">${esc(r.sku)}<div class="muted">${esc(r.site)} · ${esc(r.store)}</div></td>
        <td>${esc(r.name)}</td>
        <td class="num">${money2(r.price)}</td>
        <td class="num">${money2(r.cost)}</td>
        <td class="num">${money2(r.freight)}</td>
        <td class="num">${money2(r.storage)}</td>
        <td class="num">${money2(r.commission)}</td>
        <td class="num">${money2(r.delivery)}</td>
        <td class="num">${money2(r.ad)}</td>
        <td class="num"><b class="${r.profit < 0 ? "neg" : ""}">${money2(r.profit)}</b></td>
        <td class="num">${badge(r.margin + "%", r.margin >= 20 ? "green" : r.margin >= 12 ? "amber" : "red")}</td>
        <td class="num muted">${r.updated}</td>
        <td class="num">${actions("skuProfit", i)}</td></tr>`).join("");
      entity = "skuProfit";
      note = "单件毛利 = 售价 − 采购成本 − 头程 − 仓储 − 平台佣金 − 平台配送费 − 广告分摊。采购成本、头程、仓储、佣金、配送费每天可能波动，改动后更新日期留痕。";
    } else {
      cols = ["供应商", "品类", "联系人", "评级", "状态"];
      rows = D.suppliers.map((r, i) => `<tr data-row>
        <td class="name">${esc(r.name)}</td><td>${esc(r.category)}</td><td class="muted">${esc(r.contact)}</td>
        <td>${badge(r.rating, r.rating === "A" ? "green" : "amber")}</td>
        <td>${badge(r.status, r.status === "启用" ? "green" : "gray")}</td>
        <td class="num">${actions("supplier", i)}</td></tr>`).join("");
      entity = "supplier";
      note = "供应商可自定义新增、修改；停用后不影响历史采购单，但新建采购单时不可选。";
    }

    const count = { stores: D.stores.length, sites: D.sites.length, skuProfit: D.skuProfit.length, suppliers: D.suppliers.length }[tab];

    return `
      <div class="card">
        ${cardHead("基础档案", "先维护档案，再录业务数据", `<button class="btn primary" data-act="edit" data-entity="${entity}">＋ 新增</button>`)}
        <div class="toolbar">
          <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${tab === k ? "active" : ""}" data-act="tab" data-tab="${k}">${n} <span class="cnt">${k === "stores" ? D.stores.length : k === "sites" ? D.sites.length : k === "skuProfit" ? D.skuProfit.length : D.suppliers.length}</span></button>`).join("")}</div>
          ${searchBox("搜索编码 / 名称")}
        </div>
        <table class="table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}<th class="num">操作</th></tr></thead>
        <tbody>${rows || emptyRow(cols.length + 1)}</tbody></table>
        <div class="hr"></div>
        <div class="note">${note}</div>
      </div>`;
  }

  /* ---------------- 导入 ---------------- */
  function importer() {
    const rows = D.imports.map(r => `<tr data-row><td class="muted">${r.time}</td><td>${r.type}</td><td class="name">${r.file}</td>
      <td class="num">${r.rows}</td><td class="num">${r.ok}</td><td class="num">${r.fail ? `<span class="badge red">${r.fail}</span>` : "0"}</td><td>${r.by}</td></tr>`).join("");
    const tpls = [
      ["销售明细模板", "日期、店铺（公司）、站点、SKU、ASIN、币种、销量、本币销售额、退款"],
      ["广告数据模板", "日期、店铺、站点、SKU、广告类型(SP/SB/SD)、活动、曝光、点击、花费、广告销售额"],
      ["资金流水模板", "日期、账户、科目、对方单位、金额、备注"],
      ["FBA 库存模板", "日期、SKU、店铺、站点、可售数量、国内在途、FBA 在途"]
    ].map(([n, d]) => `<div class="tpl"><div class="ico">X</div><div><b>${n}</b><div class="muted" style="font-size:12px">${d}</div></div><div class="right"><button class="btn">下载</button></div></div>`).join("");

    const types = ["销售明细", "广告数据", "资金流水", "FBA 库存"];
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
          <tr><td class="num">18</td><td>SKU</td><td>SKU-9911 在档案中不存在</td><td>先在「基础档案 → SKU 利润表」新增</td></tr>
          <tr><td class="num">24</td><td>日期</td><td>日期格式无法识别（2026/13/02）</td><td>改为 YYYY-MM-DD</td></tr>
          <tr><td class="num">31</td><td>店铺</td><td>公司名称未维护</td><td>先在「基础档案 → 店铺」新增</td></tr>
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

  /* ---------------- 表单 ---------------- */
  const companyOpts = () => D.stores.filter(s => s.status === "启用").map(s => s.name);
  const siteOpts = () => D.sites.filter(s => s.status === "启用").map(s => s.name);
  const skuOpts = () => D.skuProfit.map(s => s.sku);

  const FORMS = {
    store: {
      title: "店铺（公司）", get: () => D.stores, key: "name",
      fields: [
        { k: "name", l: "公司名称", t: "text", req: 1, ph: "如 深圳市星野科技有限公司" },
        { k: "site", l: "默认站点", t: "select", opts: siteOpts },
        { k: "status", l: "状态", t: "select", opts: ["启用", "停用"] }
      ]
    },
    site: {
      title: "站点", get: () => D.sites, key: "name",
      fields: [
        { k: "name", l: "销售国", t: "text", req: 1, ph: "如 法国" },
        { k: "currency", l: "结算币种", t: "select", opts: ["USD", "EUR", "GBP", "CAD", "BRL", "MXN", "JPY", "AUD"] },
        { k: "status", l: "状态", t: "select", opts: ["启用", "停用"] }
      ]
    },
    skuProfit: {
      title: "SKU 利润", get: () => D.skuProfit, key: "sku",
      fields: [
        { k: "sku", l: "SKU 编码", t: "text", req: 1 },
        { k: "name", l: "产品名称", t: "text", req: 1 },
        { k: "site", l: "站点", t: "select", opts: siteOpts },
        { k: "price", l: "售价（¥）", t: "number", req: 1 },
        { k: "cost", l: "采购成本（¥）", t: "number" },
        { k: "freight", l: "头程（¥/件）", t: "number" },
        { k: "storage", l: "仓储（¥/件）", t: "number" },
        { k: "commission", l: "平台佣金（¥）", t: "number" },
        { k: "delivery", l: "平台配送费（¥）", t: "number" },
        { k: "ad", l: "广告分摊（¥）", t: "number" }
      ]
    },
    supplier: {
      title: "供应商", get: () => D.suppliers, key: "name",
      fields: [
        { k: "name", l: "供应商名称", t: "text", req: 1 },
        { k: "category", l: "品类", t: "text" },
        { k: "contact", l: "联系人 / 电话", t: "text" },
        { k: "rating", l: "评级", t: "select", opts: ["A", "B", "C"] },
        { k: "status", l: "状态", t: "select", opts: ["启用", "停用"] }
      ]
    },
    purchase: {
      title: "采购单", get: () => D.purchases, key: "no",
      fields: [
        { k: "no", l: "采购单号", t: "text", req: 1, ph: "如 PO-20261026" },
        { k: "type", l: "采购类型", t: "select", opts: ["外采", "代加工"] },
        { k: "batch", l: "批次号", t: "text", ph: "如 B20261026-01" },
        { k: "supplier", l: "供应商", t: "select", opts: () => D.suppliers.filter(s => s.status === "启用").map(s => s.name) },
        { k: "store", l: "店铺（公司）", t: "select", opts: companyOpts },
        { k: "site", l: "站点", t: "select", opts: siteOpts },
        { k: "sku", l: "SKU", t: "select", opts: skuOpts },
        { k: "qty", l: "采购数量", t: "number", req: 1 },
        { k: "amount", l: "采购金额（¥）", t: "number", req: 1 },
        { k: "paid", l: "已付金额（¥）", t: "number" },
        { k: "eta", l: "预计到仓", t: "date" },
        { k: "owner", l: "负责人", t: "text" }
      ]
    },
    project: {
      title: "开发项目", get: () => D.projects, key: "code",
      fields: [
        { k: "code", l: "项目编号", t: "text", req: 1, ph: "如 PD-2026-11" },
        { k: "name", l: "项目名称", t: "text", req: 1 },
        { k: "stage", l: "阶段", t: "select", opts: D.projectStages },
        { k: "owner", l: "负责人", t: "text" },
        { k: "cost", l: "已投入（¥）", t: "number" },
        { k: "target", l: "目标上市", t: "date" }
      ]
    },
    sales: {
      title: "销售记录", get: () => D.sales, key: "_id",
      fields: [
        { k: "date", l: "日期", t: "date", req: 1 },
        { k: "store", l: "店铺（公司）", t: "select", opts: companyOpts },
        { k: "site", l: "站点", t: "select", opts: siteOpts },
        { k: "sku", l: "SKU", t: "select", opts: skuOpts },
        { k: "asin", l: "ASIN", t: "text", ph: "如 B0B8X1Q2M3" },
        { k: "currency", l: "录入币种", t: "select", opts: ["USD", "EUR", "GBP", "CAD", "BRL", "MXN"] },
        { k: "qty", l: "销量（件）", t: "number", req: 1 },
        { k: "amountLocal", l: "本币销售额", t: "number", req: 1 },
        { k: "refund", l: "退款（¥）", t: "number" },
        { k: "ad", l: "广告费（¥）", t: "number" }
      ]
    },
    ads: {
      title: "广告数据", get: () => D.ads, key: "_id",
      fields: [
        { k: "date", l: "日期", t: "date", req: 1 },
        { k: "type", l: "广告类型", t: "select", opts: ["SP", "SB", "SD"] },
        { k: "campaign", l: "活动名称", t: "text", req: 1 },
        { k: "store", l: "店铺（公司）", t: "select", opts: companyOpts },
        { k: "site", l: "站点", t: "select", opts: siteOpts },
        { k: "sku", l: "SKU", t: "select", opts: skuOpts },
        { k: "impressions", l: "曝光", t: "number" },
        { k: "clicks", l: "点击", t: "number" },
        { k: "spend", l: "花费（¥）", t: "number", req: 1 },
        { k: "sales", l: "广告销售额（¥）", t: "number" },
        { k: "orders", l: "订单数", t: "number" }
      ]
    },
    finance: {
      title: "收支流水", get: () => D.finance, key: "_id",
      fields: [
        { k: "date", l: "日期", t: "date", req: 1 },
        { k: "type", l: "类型", t: "select", opts: ["支出", "收入"] },
        { k: "account", l: "账户", t: "select", opts: ["招行对公", "PingPong", "Payoneer"] },
        { k: "category", l: "科目", t: "select", opts: ["采购货款", "头程运费", "FBA 仓储费", "广告费", "平台佣金", "店铺回款", "其他收入"] },
        { k: "counterparty", l: "对方单位", t: "text" },
        { k: "amount", l: "金额（¥，支出填正数）", t: "number", req: 1 },
        { k: "note", l: "备注", t: "text" }
      ]
    }
  };

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
    const coll = cfg.get();
    const rec = index != null ? coll[index] : null;
    const fields = cfg.fields.map(f => {
      const opts = typeof f.opts === "function" ? f.opts() : f.opts;
      const v = rec ? rec[f.k] : (f.t === "select" ? (opts ? opts[0] : "") : (f.k === "date" ? ANCHOR : ""));
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
    const coll = cfg.get();
    const data = {};
    [...form.querySelectorAll("input,select")].forEach(el => {
      data[el.name] = el.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value.trim();
    });

    if (entity === "store") data.updated = ANCHOR;
    if (entity === "skuProfit") {
      const price = +data.price || 0;
      data.commission = +(price * 0.15).toFixed(2);
      data.ad = data.ad || +(price * 0.10).toFixed(2);
      data.profit = +(price - (+data.cost || 0) - (+data.freight || 0) - (+data.storage || 0) - data.commission - (+data.delivery || 0) - data.ad).toFixed(2);
      data.margin = price ? +(data.profit / price * 100).toFixed(1) : 0;
      data.updated = ANCHOR;
      const base = D.skuProfit.find(x => x.sku === data.sku) || D.skus.find(x => x.sku === data.sku);
      data.store = base ? base.store : (D.stores[0] || {}).name || "";
      data.site = data.site || (base ? base.site : "美国");
    }
    if (entity === "sales") {
      const rate = D.fx[data.currency] || D.fx.USD;
      data.amount = +(data.amountLocal * rate);
      data.commission = +(data.amount * 0.15);
      const sp = D.skuProfit.find(x => x.sku === data.sku) || {};
      const nm = D.skus.find(x => x.sku === data.sku) || {};
      data.name = nm.name || sp.name || "";
      data.cost = (+sp.cost || 0) * data.qty;
      data.delivery = (+sp.delivery || 0) * data.qty;
      data.freight = (+sp.freight || 0) * data.qty;
      data.storage = (+sp.storage || 0) * data.qty;
      data.profit = +(data.amount - (+data.refund || 0) - data.cost - data.freight - data.storage - data.commission - data.delivery - (+data.ad || 0));
      data.margin = data.amount ? +(data.profit / data.amount * 100).toFixed(1) : 0;
    }
    if (entity === "ads") {
      data.spend = +data.spend || 0;
      data.sales = +data.sales || 0;
      data.impressions = +data.impressions || 0;
      data.clicks = +data.clicks || 0;
      data.orders = +data.orders || 0;
    }
    if (entity === "purchase") {
      data.paid = +data.paid || 0;
      data.type = data.type || "外采";
      data.batch = data.batch || "";
      data.stage = 0;
      data.shipTo = "FBA";
      const sku = D.skus.find(x => x.sku === data.sku);
      data.name = sku ? sku.name : "";
      data.timeline = [{ stage: "采购申请", time: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"), by: "老板", note: "新建采购单" }];
    }
    if (entity === "project") data.step = Math.max(0, D.projectStages.indexOf(data.stage));

    if (idx == null) {
      if (entity === "finance") data.date = data.date || ANCHOR;
      coll.unshift(data);
    } else {
      Object.assign(coll[idx], data);
    }
    closeForm();
    toast(idx == null ? "新增成功" : "已保存");
    render();
  }

  /* ---------------- toast & tooltip ---------------- */
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

  let tipEl = null;
  function showTip(text, x, y) {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "hovercard";
      document.body.appendChild(tipEl);
    }
    tipEl.textContent = text;
    tipEl.style.display = "block";
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = Math.min(window.innerWidth - w - 12, x + 14) + "px";
    tipEl.style.top = Math.max(8, Math.min(window.innerHeight - h - 12, y + 16)) + "px";
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el) return;
    showTip(el.dataset.tip, e.clientX, e.clientY);
  });
  document.addEventListener("mousemove", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el || !tipEl) return;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = Math.min(window.innerWidth - w - 12, e.clientX + 14) + "px";
    tipEl.style.top = Math.max(8, Math.min(window.innerHeight - h - 12, e.clientY + 16)) + "px";
  });
  document.addEventListener("mouseout", (e) => {
    if (!e.target.closest || !e.target.closest("[data-tip]")) return;
    if (tipEl) tipEl.style.display = "none";
  });

  /* ---------------- 图表 ---------------- */
  const charts = [];
  function addChart(ctx, cfg) {
    if (!window.Chart) return;
    cfg.options = Object.assign({
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { intersect: false, mode: "index" } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#93a0b4", font: { size: 11 } } },
        y: { grid: { color: "#eef1f6" }, border: { display: false }, ticks: { color: "#93a0b4", font: { size: 11 } } }
      }
    }, cfg.options || {});
    charts.push(new Chart(ctx, cfg));
  }
  function clearCharts() { while (charts.length) { try { charts.pop().destroy(); } catch (e) {} } }

  function buckets(r) {
    const days = [];
    for (let t = Date.parse(r.from + "T00:00:00Z"); t <= Date.parse(r.to + "T00:00:00Z"); t += DAY) {
      days.push(new Date(t).toISOString().slice(0, 10));
    }
    const size = Math.max(1, Math.ceil(days.length / 9));
    const out = [];
    for (let i = 0; i < days.length; i += size) {
      const ds = days.slice(i, i + size);
      out.push({ label: ds.length > 1 ? md(ds[0]) + "~" + md(ds[ds.length - 1]) : md(ds[0]), from: ds[0], to: ds[ds.length - 1] });
    }
    return out;
  }

  function seriesBy(list, r, k) {
    return buckets(r).map(b => list.filter(x => x.date >= b.from && x.date <= b.to).reduce((a, x) => a + (+x[k] || 0), 0));
  }

  function draw() {
    clearCharts();
    const r = range();
    const blue = "#2563eb", green = "#0f9d63", amber = "#e0a63a";
    const legend = { display: true, position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: "#64748b", font: { size: 11 } } };

    if (state.route === "overview") {
      const el = document.getElementById("cTrend");
      if (el) {
        const s = salesRows(r);
        addChart(el, {
          type: "line",
          data: {
            labels: buckets(r).map(b => b.label),
            datasets: [
              { label: "销售额", data: seriesBy(s, r, "amount"), borderColor: blue, backgroundColor: "rgba(37,99,235,.08)", fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHitRadius: 12 },
              { label: "毛利", data: seriesBy(s, r, "profit"), borderColor: green, backgroundColor: "rgba(15,157,99,.06)", fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHitRadius: 12 },
              { label: "广告花费", data: seriesBy(adRows(r), r, "spend"), borderColor: amber, backgroundColor: "rgba(224,166,58,.06)", fill: false, tension: .35, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, pointHitRadius: 12 }
            ]
          },
          options: {
            plugins: { legend, tooltip: { callbacks: { label: (c) => `${c.dataset.label}：${money(c.parsed.y)}` } } },
            scales: { y: { ticks: { callback: v => "¥" + v / 1000 + "k" } } }
          }
        });
      }
      const b = document.getElementById("cCash");
      if (b) addChart(b, {
        type: "bar",
        data: {
          labels: D.cashflow.labels,
          datasets: [
            { label: "收入", data: D.cashflow.income, backgroundColor: "#93b4f5", borderRadius: 5, barPercentage: .6 },
            { label: "支出", data: D.cashflow.expense, backgroundColor: "#e2e8f0", borderRadius: 5, barPercentage: .6 }
          ]
        },
        options: {
          plugins: { legend, tooltip: { callbacks: { label: (c) => `${c.dataset.label}：${money(c.parsed.y)}` } } },
          scales: { y: { ticks: { callback: v => "¥" + v / 10000 + "万" } } }
        }
      });
    }

    if (state.route === "cash") {
      const el = document.getElementById("cFlow");
      if (el) {
        const list = D.finance.filter(f => inR(f.date, r));
        const bs = buckets(r);
        addChart(el, {
          type: "bar",
          data: {
            labels: bs.map(b => b.label),
            datasets: [
              { label: "收入", data: bs.map(b => list.filter(f => f.amount > 0 && f.date >= b.from && f.date <= b.to).reduce((a, f) => a + f.amount, 0)), backgroundColor: blue, borderRadius: 5, barPercentage: .62 },
              { label: "支出", data: bs.map(b => Math.abs(list.filter(f => f.amount < 0 && f.date >= b.from && f.date <= b.to).reduce((a, f) => a + f.amount, 0))), backgroundColor: "#cbd5e1", borderRadius: 5, barPercentage: .62 }
            ]
          },
          options: {
            plugins: { legend, tooltip: { callbacks: { label: (c) => `${c.dataset.label}：${money(c.parsed.y)}` } } },
            scales: { y: { ticks: { callback: v => "¥" + v / 10000 + "万" } } }
          }
        });
      }
    }

    if (state.route === "sales") {
      const el = document.getElementById("cSkuMix");
      if (el) {
        const s = salesRows(r);
        const skus = [...new Set(s.map(x => x.sku))];
        addChart(el, {
          data: {
            labels: skus,
            datasets: [
              { type: "bar", label: "销售额", data: skus.map(k => s.filter(x => x.sku === k).reduce((a, x) => a + x.amount, 0)), backgroundColor: "#93b4f5", borderRadius: 5, barPercentage: .7, yAxisID: "y" },
              { type: "bar", label: "广告花费", data: skus.map(k => s.filter(x => x.sku === k).reduce((a, x) => a + x.ad, 0)), backgroundColor: "#f0c987", borderRadius: 5, barPercentage: .7, yAxisID: "y" },
              { type: "bar", label: "销量", data: skus.map(k => s.filter(x => x.sku === k).reduce((a, x) => a + x.qty, 0)), backgroundColor: "#0f9d63", borderRadius: 5, barPercentage: .7, yAxisID: "y1" }
            ]
          },
          options: {
            plugins: { legend, tooltip: { callbacks: { label: (c) => c.dataset.label === "销量" ? `销量：${num(c.parsed.y)} 件` : `${c.dataset.label}：${money(c.parsed.y)}` } } },
            scales: {
              y: { position: "left", ticks: { callback: v => "¥" + v / 1000 + "k" }, grid: { color: "#eef1f6" } },
              y1: { position: "right", grid: { display: false }, ticks: { callback: v => v + " 件" } }
            }
          }
        });
      }
    }

    if (state.route === "ads") {
      const el = document.getElementById("cAds");
      if (el) {
        const a = adRows(r);
        addChart(el, {
          type: "bar",
          data: {
            labels: buckets(r).map(b => b.label),
            datasets: [
              { label: "SP 商品推广", data: seriesBy(a.filter(x => x.type === "SP"), r, "spend"), backgroundColor: "#93b4f5", borderRadius: 4, stack: "s" },
              { label: "SB 品牌推广", data: seriesBy(a.filter(x => x.type === "SB"), r, "spend"), backgroundColor: "#0f9d63", borderRadius: 4, stack: "s" },
              { label: "SD 展示推广", data: seriesBy(a.filter(x => x.type === "SD"), r, "spend"), backgroundColor: "#f0c987", borderRadius: 4, stack: "s" }
            ]
          },
          options: {
            plugins: { legend, tooltip: { callbacks: { label: (c) => `${c.dataset.label}：${money(c.parsed.y)}` } } },
            scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => "¥" + v / 1000 + "k" } } }
          }
        });
      }
    }
  }

  /* ---------------- 路由 ---------------- */
  const views = { overview, todo: todoPage, purchase, cash, goods, sales, ads, product, import: importer, master, account };

  const titles = {
    overview: ["首页总览", "钱去哪了、货在哪、卖得怎么样，一屏看完"],
    todo: ["待办中心", "异常、待付款、未分摊，按优先级处理"],
    purchase: ["采购管理", "采购单推进 + 批次追踪，一页管到底"],
    cash: ["资金流动", "账户余额、收支流水、费用分摊与应付账款"],
    goods: ["货物流动", "FBA 库存、在途与补货建议，一本账"],
    sales: ["销售数据", "销量、售价、广告花费与 SKU 毛利"],
    ads: ["广告运营", "SP / SB / SD 广告花费与效果，按 店铺 × 站点 × SKU 归集"],
    product: ["产品开发", "项目台账与四步流程进度"],
    import: ["数据导入", "Excel 模板下载、导入校验与失败行反馈"],
    master: ["基础档案", "店铺（公司）、站点、SKU 利润表、供应商"],
    account: ["账号与日志", "账号增停、重置密码、操作留痕"]
  };

  function render() {
    const route = (location.hash.replace(/^#\//, "") || "overview").split("?")[0];
    if (route === "trace") { state.purchaseTab = "trace"; location.replace("#/purchase"); return; }
    state.route = views[route] ? route : "overview";
    document.getElementById("view").innerHTML = views[state.route]();
    document.querySelectorAll("#view table").forEach(t => {
      if (t.querySelectorAll("thead th").length < 6) return; // 小表不强制 720 宽，避免窄卡片横向滚动
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
    const r = range();
    const days = Math.round((Date.parse(r.to + "T00:00:00Z") - Date.parse(r.from + "T00:00:00Z")) / DAY) + 1;
    const note = document.getElementById("rangeNote");
    if (note) note.textContent = `${r.from} ~ ${r.to} · ${days} 天`;
    document.querySelectorAll(".nav-item").forEach(a => a.classList.toggle("active", a.dataset.route === state.route));
    window.scrollTo({ top: 0 });
    draw();
  }

  /* ---------------- 过滤器 ---------------- */
  function initFilters() {
    const fp = document.getElementById("fPeriod");
    fp.innerHTML = PRESETS.map(p => `<option value="${p.k}" ${p.k === state.period ? "selected" : ""}>${p.label}</option>`).join("");
    const fs = document.getElementById("fStore");
    fs.innerHTML = [`<option>全部店铺</option>`].concat(D.stores.filter(s => s.status === "启用").map(s => `<option>${esc(s.name)}</option>`)).join("");
    const fi = document.getElementById("fSite");
    fi.innerHTML = [`<option>全部站点</option>`].concat(D.sites.filter(s => s.status === "启用").map(s => `<option>${esc(s.name)}</option>`)).join("");
    document.getElementById("fFrom").value = state.from;
    document.getElementById("fTo").value = state.to;
  }

  window.addEventListener("hashchange", render);

  document.addEventListener("change", (e) => {
    if (e.target.id === "fPeriod") {
      state.period = e.target.value;
      const isCustom = state.period === "custom";
      document.getElementById("customRange").classList.toggle("show", isCustom);
      if (!isCustom) { const r = range(); state.from = r.from; state.to = r.to; document.getElementById("fFrom").value = r.from; document.getElementById("fTo").value = r.to; }
      state.page = { sales: 1, goods: 1, ads: 1 };
      render();
    }
    if (e.target.id === "fFrom") { state.from = e.target.value; state.period = "custom"; document.getElementById("fPeriod").value = "custom"; render(); }
    if (e.target.id === "fTo") { state.to = e.target.value; state.period = "custom"; document.getElementById("fPeriod").value = "custom"; render(); }
    if (e.target.id === "fStore") { state.store = e.target.value; state.page = { sales: 1, goods: 1, ads: 1 }; render(); }
    if (e.target.id === "fSite") { state.site = e.target.value; state.page = { sales: 1, goods: 1, ads: 1 }; render(); }
    if (e.target.matches("[data-col]")) {
      state.cols[e.target.dataset.col] = e.target.checked;
      render();
    }
  });

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
      if (act === "tab-master") { location.hash = "#/master"; state.masterTab = el.dataset.tab; render(); return; }
      if (act === "todo-filter") { state.todoFilter = el.dataset.level; render(); return; }
      if (act === "po-filter") { state.purchaseStage = el.dataset.stage; render(); return; }
      if (act === "trace-filter") { state.tracePos = el.dataset.pos; render(); return; }
      if (act === "po-tab") { state.purchaseTab = el.dataset.tab; render(); return; }
      if (act === "po-open") { openPurchase(Number(el.dataset.key)); return; }
      if (act === "po-next") {
        const i = Number(el.dataset.key);
        const p = D.purchases[i];
        if (p.stage < D.purchaseStages.length - 1) {
          p.stage += 1;
          p.timeline.push({ stage: D.purchaseStages[p.stage], time: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"), by: "老板", note: "手动推进" });
          toast("已推进到「" + D.purchaseStages[p.stage] + "」");
        }
        closeForm();
        render();
        return;
      }
      if (act === "po-prev") {
        const i = Number(el.dataset.key);
        const p = D.purchases[i];
        if (p.stage <= 0) return;
        if (confirm(`确认把 ${p.no} 从「${D.purchaseStages[p.stage]}」回退到「${D.purchaseStages[p.stage - 1]}」？回退会记入操作日志。`)) {
          p.stage -= 1;
          p.timeline.pop();
          toast("已回退到「" + D.purchaseStages[p.stage] + "」");
        }
        closeForm();
        render();
        return;
      }
      if (act === "todo-done") {
        const i = Number(el.dataset.key);
        D.todos[i].status = "已处理";
        toast("已标记处理");
        render();
        return;
      }
      if (act === "page") {
        state.page[el.dataset.pageKey] = Number(el.dataset.page);
        render();
        return;
      }
      if (act === "cmp-dim") { state.compareDim = el.dataset.dim; render(); return; }
      if (act === "ad-type") { state.adType = el.dataset.type; state.page.ads = 1; render(); return; }
      if (act === "proj-filter") { state.projStage = el.dataset.stage; render(); return; }
      if (act === "edit") { openForm(el.dataset.entity, el.dataset.key === undefined ? null : Number(el.dataset.key)); return; }
      if (act === "del") {
        const entity = el.dataset.entity, idx = Number(el.dataset.key);
        const cfg = FORMS[entity];
        const coll = cfg.get();
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

  initFilters();
  render();
})();
