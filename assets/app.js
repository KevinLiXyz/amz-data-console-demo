/* AMZ 数据台 · 交互原型（演示数据，无后端） */
(function () {
  const D = window.DEMO;
  const money = (n) => {
    const v = Math.round(n);
    const s = Math.abs(v).toLocaleString("en-US");
    return (v < 0 ? "-¥" : "¥") + s;
  };
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const pct = (n, d = 1) => (n > 0 ? "+" : "") + n.toFixed(d) + "%";

  const state = {
    route: "overview",
    store: "全部店铺",
    site: "全部站点",
    period: "2026-10-01 ~ 2026-10-25",
    compare: true
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
    overview: ["经营总览", "钱去哪了、货在哪、卖得怎么样，一屏看完"],
    cash: ["资金流动", "账户余额、收支流水、费用分摊与应付账款"],
    goods: ["货物流动", "采购 → 头程 → 在途 → 海外仓库存，一本账"],
    sales: ["销售数据", "销量、售价、退款与 SKU 毛利"],
    product: ["产品开发", "项目台账、供应商打样与开发成本归集"],
    import: ["数据导入", "Excel 模板下载、导入校验与失败行反馈"],
    account: ["账号与日志", "账号增停、重置密码、操作留痕"]
  };

  const charts = [];
  function addChart(ctx, cfg) {
    if (!window.Chart) return;
    cfg.options = Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { intersect: false, mode: "index" } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#93a0b4", font: { size: 11 } } },
        y: { grid: { color: "#eef1f6" }, border: { display: false }, ticks: { color: "#93a0b4", font: { size: 11 } } }
      }
    }, cfg.options || {});
    charts.push(new Chart(ctx, cfg));
  }
  function clearCharts() {
    while (charts.length) { try { charts.pop().destroy(); } catch (e) {} }
  }

  const badge = (text, cls) => `<span class="badge ${cls}">${text}</span>`;
  const kpiCard = (k) => {
    const f = factor();
    const v = k.value * f;
    const neg = v < 0;
    const up = k.delta >= 0;
    return `<div class="card kpi">
      <div class="label">${k.label}</div>
      <div class="value ${neg ? "neg" : ""}">${money(v)}</div>
      <div class="foot">
        ${state.compare ? `<span class="delta ${up ? "up" : "down"}">${pct(k.delta)}</span><span>较上期</span>` : `<span>本期</span>`}
        <span class="muted">·</span><span>${k.hint}</span>
      </div>
    </div>`;
  };

  /* ---------------- 总览 ---------------- */
  function overview() {
    const f = factor();
    const todos = D.todos.map(t => {
      const cls = t.level === "高" ? "high" : t.level === "中" ? "mid" : "low";
      return `<div class="todo-item"><span class="dot ${cls}"></span><div class="txt">${t.text}</div><div class="tm">${t.time}</div></div>`;
    }).join("");

    const transit = D.transit.map(t => `
      <tr><td class="name">${t.lane}</td><td class="num">${num(t.qty * f)} 件</td>
      <td>${badge(t.status, t.status === "清关中" ? "amber" : t.status === "派送中" ? "blue" : "gray")}</td>
      <td class="muted num">${t.eta}</td></tr>`).join("");

    const stockRows = D.stock.slice(0, 4).map(s => `
      <tr><td class="name">${s.sku}<div class="muted">${s.name}</div></td>
      <td>${s.store}</td><td class="num">${num(s.qty * f)}</td><td class="num">${s.age}</td>
      <td>${s.status === "正常" ? badge("正常", "green") : s.status === "缺货" ? badge("缺货", "red") : badge(s.status, "amber")}</td></tr>`).join("");

    return `
      <div class="grid g4">${D.kpi.map(kpiCard).join("")}</div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>销售与毛利趋势</h2><span class="sub">按日</span>
            <div class="right"><button class="btn ghost">导出</button></div></div>
          <div class="chart-wrap"><canvas id="cTrend"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>待办与异常提醒</h2><span class="sub">4 条</span></div>
          <div class="todo">${todos}</div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>资金收支</h2><span class="sub">收入 / 支出</span></div>
          <div class="chart-wrap sm"><canvas id="cCash"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>货物在途</h2><span class="sub">4 条航线</span></div>
          <table class="table"><thead><tr><th>航线</th><th class="num">数量</th><th>状态</th><th class="num">预计到仓</th></tr></thead>
          <tbody>${transit}</tbody></table>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>库存快照</h2><span class="sub">海外仓</span>
          <div class="right"><a class="btn ghost" href="#/goods">查看台账</a></div></div>
        <table class="table"><thead><tr><th>SKU</th><th>店铺</th><th class="num">可用库存</th><th class="num">库龄</th><th>状态</th></tr></thead>
        <tbody>${stockRows}</tbody></table>
      </div>`;
  }

  /* ---------------- 资金 ---------------- */
  function cash() {
    const f = factor();
    const balance = D.accounts.reduce((s, a) => s + a.balance, 0) * f;
    const income = 168000 * f, expense = 136000 * f;
    const rows = D.finance.map(r => `
      <tr><td class="muted">${r.date}</td><td>${badge(r.type, r.type === "收入" ? "green" : "gray")}</td>
      <td>${r.account}</td><td>${r.category}</td><td>${r.counterparty}</td>
      <td class="num ${r.amount < 0 ? "" : "mono"}">${money(r.amount * f)}</td><td class="muted">${r.note}</td></tr>`).join("");
    const payables = D.payables.map(p => `
      <tr><td class="name">${p.no}</td><td>${p.supplier}</td><td class="num">${money(p.amount * f)}</td>
      <td class="num">${money(p.paid * f)}</td><td class="num">${money((p.amount - p.paid) * f)}</td>
      <td class="num">${p.due}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">账户余额合计</div><div class="value">${money(balance)}</div>
          <div class="foot"><span>3 个账户</span></div></div>
        <div class="card kpi"><div class="label">本期收入</div><div class="value">${money(income)}</div>
          <div class="foot"><span class="delta up">${pct(6.4)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">本期支出</div><div class="value">${money(expense)}</div>
          <div class="foot"><span class="delta down">${pct(9.1)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">净现金流</div><div class="value ${income - expense < 0 ? "neg" : ""}">${money(income - expense)}</div>
          <div class="foot"><span>含在途应付 ${money(54200 * f)}</span></div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>收支趋势</h2><span class="sub">按周汇总</span></div>
          <div class="chart-wrap"><canvas id="cFlow"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>账户余额</h2><span class="sub">按账户</span></div>
          <div class="mini-list">
            ${D.accounts.map(a => {
              const v = a.balance * f;
              const w = Math.max(6, Math.round(v / (balance || 1) * 100));
              return `<div class="mini-row"><div class="k">${a.name}</div><div class="bar"><i style="width:${w}%"></i></div><div class="v">${money(v)}</div></div>`;
            }).join("")}
          </div>
          <div class="hr"></div>
          <div class="note">费用分摊：本期头程 ¥15,800、仓储 ¥4,200 已按采购数量分摊到 SKU；未分摊金额 ¥0。</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>收支明细</h2><span class="sub">最近 6 条</span>
          <div class="right"><div class="toolbar" style="margin:0"><input class="search" placeholder="搜索对方单位 / 科目" /><button class="btn">筛选</button><button class="btn primary">＋ 登记流水</button></div></div></div>
        <table class="table"><thead><tr><th>日期</th><th>类型</th><th>账户</th><th>科目</th><th>对方单位</th><th class="num">金额</th><th>备注</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>

      <div class="card">
        <div class="card-head"><h2>应付账款</h2><span class="sub">采购未付与物流费</span>
          <div class="right">${badge("3 笔待付 · 最近 10-28 到期", "amber")}</div></div>
        <table class="table"><thead><tr><th>采购单号</th><th>供应商</th><th class="num">金额</th><th class="num">已付</th><th class="num">未付</th><th class="num">到期日</th></tr></thead>
        <tbody>${payables}</tbody></table>
      </div>`;
  }

  /* ---------------- 货物 ---------------- */
  function goods() {
    const f = factor();
    const list = D.stock.filter(s => state.store === "全部店铺" || s.store === state.store);
    const rows = list.map(s => `
      <tr><td class="name">${s.sku}<div class="muted">${s.name}</div></td><td>${s.store}</td><td>${s.warehouse}</td>
      <td class="num">${num(s.qty * f)}</td><td class="num">${s.age}</td><td class="num">${money(s.cost)}</td><td class="num">${money(s.value * f)}</td>
      <td>${s.status === "正常" ? badge("正常", "green") : s.status === "缺货" ? badge("缺货", "red") : badge(s.status, "amber")}</td></tr>`).join("");
    const transit = D.transit.map(t => `
      <tr><td class="name">${t.lane}</td><td class="num">${num(t.qty * f)} 件</td>
      <td>${badge(t.status, t.status === "清关中" ? "amber" : t.status === "派送中" ? "blue" : "gray")}</td><td class="num">${t.eta}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">在途件数</div><div class="value">${num(2420 * f)}</div><div class="foot">4 条航线 · 最近到仓 10-26</div></div>
        <div class="card kpi"><div class="label">海外仓可用库存</div><div class="value">${num(2624 * f)}</div><div class="foot">4 个仓 · 5 个 SKU</div></div>
        <div class="card kpi"><div class="label">缺货 SKU</div><div class="value neg">1</div><div class="foot">US-B · 宠物自动喂食器</div></div>
        <div class="card kpi"><div class="label">库龄 &gt; 90 天</div><div class="value">${num(64 * f)} 件</div><div class="foot">1 个 SKU · 建议促销</div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>在途与到仓</h2><span class="sub">按航线</span></div>
          <table class="table"><thead><tr><th>航线</th><th class="num">数量</th><th>状态</th><th class="num">预计到仓</th></tr></thead><tbody>${transit}</tbody></table>
        </div>
        <div class="card">
          <div class="card-head"><h2>库龄分布</h2><span class="sub">按件数</span></div>
          <div class="mini-list">
            <div class="mini-row"><div class="k">0–30 天</div><div class="bar"><i style="width:62%"></i></div><div class="v">1,630</div></div>
            <div class="mini-row"><div class="k">31–60 天</div><div class="bar"><i style="width:24%"></i></div><div class="v">630</div></div>
            <div class="mini-row"><div class="k">61–90 天</div><div class="bar"><i style="width:10%"></i></div><div class="v">300</div></div>
            <div class="mini-row"><div class="k">&gt; 90 天</div><div class="bar"><i style="width:2%"></i></div><div class="v">64</div></div>
          </div>
          <div class="hr"></div>
          <div class="note">库存口径：移动加权平均计价；在途单列，不计入可用库存；可用 = 在库 − 锁定。</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>海外仓库存台账</h2><span class="sub">${list.length} 个 SKU</span>
          <div class="right"><div class="toolbar" style="margin:0"><input class="search" placeholder="搜索 SKU / 名称" /><button class="btn">导出</button><button class="btn primary">＋ 入库</button></div></div></div>
        <table class="table"><thead><tr><th>SKU</th><th>店铺</th><th>仓库</th><th class="num">可用库存</th><th class="num">库龄</th><th class="num">成本价</th><th class="num">库存金额</th><th>状态</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="8" class="muted">当前筛选下没有数据</td></tr>`}</tbody></table>
      </div>`;
  }

  /* ---------------- 销售 ---------------- */
  function sales() {
    const f = factor();
    const list = D.sales.filter(s => state.store === "全部店铺" || s.store === state.store);
    const total = list.reduce((a, s) => ({ qty: a.qty + s.qty, amount: a.amount + s.amount, refund: a.refund + s.refund, profit: a.profit + s.profit }), { qty: 0, amount: 0, refund: 0, profit: 0 });
    const rows = list.map(s => `
      <tr><td class="name">${s.sku}<div class="muted">${s.name}</div></td><td>${s.store}</td>
      <td class="num">${num(s.qty * f)}</td><td class="num">${money(s.amount * f)}</td><td class="num">${money(s.refund * f)}</td>
      <td class="num">${money(s.cost * f)}</td><td class="num">${money(s.commission * f)}</td><td class="num">${money(s.ad * f)}</td>
      <td class="num"><b>${money(s.profit * f)}</b></td>
      <td class="num">${badge(s.margin.toFixed(1) + "%", s.margin >= 20 ? "green" : s.margin >= 12 ? "amber" : "red")}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">销售额</div><div class="value">${money(total.amount * f)}</div>
          <div class="foot"><span class="delta down">${pct(-1.5)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">销量</div><div class="value">${num(total.qty * f)} 件</div>
          <div class="foot"><span class="delta up">${pct(2.1)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">退款率</div><div class="value">8.6%</div>
          <div class="foot"><span class="delta down">${pct(0.8)}</span><span>较上期</span></div></div>
        <div class="card kpi"><div class="label">毛利</div><div class="value ${total.profit < 0 ? "neg" : ""}">${money(total.profit * f)}</div>
          <div class="foot"><span>毛利率 14.9% · 口径含头程/仓储/佣金/广告</span></div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>SKU 毛利</h2><span class="sub">本期</span></div>
          <div class="chart-wrap"><canvas id="cProfit"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>多维对比</h2><span class="sub">店铺 × 月份</span></div>
          <table class="table"><thead><tr><th>店铺</th><th class="num">9 月</th><th class="num">10 月</th><th class="num">环比</th></tr></thead><tbody>
            <tr><td class="name">US-A</td><td class="num">¥68,400</td><td class="num">¥51,280</td><td class="num"><span class="badge red">-25.0%</span></td></tr>
            <tr><td class="name">US-B</td><td class="num">¥32,900</td><td class="num">¥39,900</td><td class="num"><span class="badge green">+21.3%</span></td></tr>
            <tr><td class="name">DE-A</td><td class="num">¥14,200</td><td class="num">¥12,810</td><td class="num"><span class="badge red">-9.8%</span></td></tr>
            <tr><td class="name">合计</td><td class="num"><b>¥115,500</b></td><td class="num"><b>¥103,990</b></td><td class="num"><span class="badge red">-10.0%</span></td></tr>
          </tbody></table>
          <div class="hr"></div>
          <div class="muted" style="font-size:12px">口径提示：毛利 = 销售额 − 退款 − 采购成本 − 头程 − 仓储 − 平台佣金 − 广告；汇率按人工维护的静态表。</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>销售明细</h2><span class="sub">按 SKU</span>
          <div class="right"><div class="toolbar" style="margin:0"><input class="search" placeholder="搜索 SKU" /><button class="btn">导出</button></div></div></div>
        <table class="table"><thead><tr><th>SKU</th><th>店铺</th><th class="num">销量</th><th class="num">销售额</th><th class="num">退款</th><th class="num">采购成本</th><th class="num">佣金</th><th class="num">广告</th><th class="num">毛利</th><th class="num">毛利率</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="10" class="muted">当前筛选下没有数据</td></tr>`}</tbody></table>
      </div>`;
  }

  /* ---------------- 产品开发 ---------------- */
  function product() {
    const rows = D.projects.map(p => `
      <tr><td class="name">${p.code}<div class="muted">${p.name}</div></td><td>${badge(p.stage, p.stage === "已上市" ? "green" : p.stage === "开模" ? "blue" : p.stage === "打样" ? "amber" : "gray")}</td>
      <td>${p.owner}</td><td class="num">${money(p.cost)}</td><td class="num">${p.target}</td>
      <td style="min-width:140px"><div class="progress"><i style="width:${p.progress}%"></i></div></td>
      <td class="num">${p.progress}%</td></tr>`).join("");
    const sup = D.suppliers.map(s => `
      <tr><td class="name">${s.name}</td><td>${s.category}</td><td class="num">${s.samples}</td><td class="num">${s.pass}</td>
      <td>${badge(s.rating, s.rating === "A" ? "green" : "amber")}</td></tr>`).join("");

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="label">在研项目</div><div class="value">3</div><div class="foot">1 个已上市</div></div>
        <div class="card kpi"><div class="label">打样中</div><div class="value">1</div><div class="foot">宠物自动喂食器 2 代</div></div>
        <div class="card kpi"><div class="label">开发成本合计</div><div class="value">¥89,900</div><div class="foot">含打样、开模、认证</div></div>
        <div class="card kpi"><div class="label">平均开发周期</div><div class="value">96 天</div><div class="foot">选品到上市</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>项目台账</h2><span class="sub">4 个项目</span>
          <div class="right"><button class="btn primary">＋ 新建项目</button></div></div>
        <table class="table"><thead><tr><th>项目</th><th>阶段</th><th>负责人</th><th class="num">已投入</th><th class="num">目标上市</th><th>进度</th><th class="num">完成度</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>

      <div class="grid g2e">
        <div class="card">
          <div class="card-head"><h2>供应商与打样</h2><span class="sub">3 家</span></div>
          <table class="table"><thead><tr><th>供应商</th><th>品类</th><th class="num">打样次数</th><th class="num">通过</th><th>评级</th></tr></thead><tbody>${sup}</tbody></table>
        </div>
        <div class="card">
          <div class="card-head"><h2>开发成本归集</h2><span class="sub">按项目</span></div>
          <div class="mini-list">
            <div class="mini-row"><div class="k">露营收纳箱</div><div class="bar"><i style="width:88%"></i></div><div class="v">¥42,300</div></div>
            <div class="mini-row"><div class="k">烘焙垫 4 件套</div><div class="bar"><i style="width:54%"></i></div><div class="v">¥25,800</div></div>
            <div class="mini-row"><div class="k">喂食器 2 代</div><div class="bar"><i style="width:39%"></i></div><div class="v">¥18,600</div></div>
            <div class="mini-row"><div class="k">车载吸尘器 Pro</div><div class="bar"><i style="width:7%"></i></div><div class="v">¥3,200</div></div>
          </div>
          <div class="hr"></div>
          <div class="note">打样费、开模费、认证费可从资金流水关联归集，避免重复录入。</div>
        </div>
      </div>`;
  }

  /* ---------------- 导入 ---------------- */
  function importer() {
    const rows = D.imports.map(r => `
      <tr><td class="muted">${r.time}</td><td>${r.type}</td><td class="name">${r.file}</td><td class="num">${r.rows}</td>
      <td class="num">${r.ok}</td><td class="num">${r.fail ? `<span class="badge red">${r.fail}</span>` : "0"}</td><td>${r.by}</td></tr>`).join("");
    const tpls = [
      ["资金流水模板", "日期、账户、科目、对方单位、金额、备注"],
      ["库存流水模板", "日期、SKU、仓库、出入库类型、数量、成本价"],
      ["销售明细模板", "日期、店铺、SKU、销量、销售额、退款、佣金、广告"],
      ["产品开发模板", "项目编号、名称、阶段、负责人、费用类型、金额"]
    ].map(([n, d]) => `<div class="tpl"><div class="ico">X</div><div><b>${n}</b><div class="muted" style="font-size:12px">${d}</div></div><div class="right"><button class="btn">下载</button></div></div>`).join("");

    return `
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>上传 Excel</h2><span class="sub">支持 .xlsx / .csv，单次 ≤ 5,000 行</span></div>
          <div class="dropzone">把文件拖到这里，或 <b>点击选择文件</b><div class="muted" style="font-size:12px;margin-top:8px">导入前请先选择数据类型，系统按模板校验字段</div></div>
          <div class="toolbar" style="margin-top:14px">
            <select class="search" style="width:170px"><option>销售明细</option><option>资金流水</option><option>库存流水</option><option>采购入库</option></select>
            <button class="btn primary">开始导入</button>
            <span class="muted" style="font-size:12px">重复数据默认跳过并提示</span>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>模板下载</h2><span class="sub">4 类</span></div>
          ${tpls}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>最近导入记录</h2><span class="sub">失败行会给出具体原因</span></div>
        <table class="table"><thead><tr><th>时间</th><th>类型</th><th>文件</th><th class="num">总行数</th><th class="num">成功</th><th class="num">失败</th><th>操作人</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>

      <div class="card">
        <div class="card-head"><h2>失败行示例</h2><span class="sub">sales_20261024.xlsx</span></div>
        <table class="table"><thead><tr><th class="num">行号</th><th>错误字段</th><th>原因</th><th>建议</th></tr></thead><tbody>
          <tr><td class="num">18</td><td>SKU</td><td>SKU-9911 在档案中不存在</td><td>先在「产品档案」新增，或改为已有 SKU</td></tr>
          <tr><td class="num">24</td><td>日期</td><td>日期格式无法识别（2026/13/02）</td><td>改为 YYYY-MM-DD</td></tr>
          <tr><td class="num">31</td><td>店铺</td><td>店铺代码 US-C 未维护</td><td>先在「店铺档案」新增店铺</td></tr>
        </tbody></table>
      </div>`;
  }

  /* ---------------- 账号 ---------------- */
  function account() {
    const users = D.users.map(u => `
      <tr><td class="name">${u.name}</td><td class="mono">${u.account}</td><td class="muted">${u.last}</td>
      <td>${u.status === "启用" ? badge("启用", "green") : badge("停用", "gray")}</td>
      <td class="num"><button class="btn">重置密码</button> <button class="btn">${u.status === "启用" ? "停用" : "启用"}</button></td></tr>`).join("");
    const logs = D.logs.map(l => `
      <tr><td class="muted">${l.time}</td><td>${l.user}</td><td>${l.module}</td><td>${badge(l.action, "blue")}</td><td class="muted">${l.detail}</td></tr>`).join("");

    return `
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>账号</h2><span class="sub">5 个（不做权限区分）</span>
            <div class="right"><button class="btn primary">＋ 新建账号</button></div></div>
          <table class="table"><thead><tr><th>姓名</th><th>登录名</th><th>最后登录</th><th>状态</th><th class="num">操作</th></tr></thead>
          <tbody>${users}</tbody></table>
          <div class="hr"></div>
          <div class="note">本期根据客户要求不做角色与模块权限：所有启用账号看到的内容相同，仅保留管理账号用于建号/停用/重置密码。</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>操作日志</h2><span class="sub">只读，不可删除</span></div>
          <table class="table"><thead><tr><th>时间</th><th>操作人</th><th>模块</th><th>操作</th><th>详情</th></tr></thead>
          <tbody>${logs}</tbody></table>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>部署信息</h2><span class="sub">客户自有服务器</span></div>
        <div class="grid g3">
          <div><div class="muted" style="font-size:12px">运行环境</div><div>轻量云服务器 · 宝塔面板</div></div>
          <div><div class="muted" style="font-size:12px">数据库</div><div>MySQL 8 · 每日 02:00 备份，保留 7 天</div></div>
          <div><div class="muted" style="font-size:12px">访问方式</div><div>浏览器访问（桌面），不做手机/平板适配</div></div>
        </div>
      </div>`;
  }

  /* ---------------- charts ---------------- */
  function draw() {
    clearCharts();
    const f = factor();
    const blue = "#2563eb", blueSoft = "rgba(37,99,235,.08)", green = "#0f9d63";

    if (state.route === "overview") {
      const el = document.getElementById("cTrend");
      if (el) addChart(el, {
        type: "line",
        data: {
          labels: D.trend.labels,
          datasets: [
            { label: "销售额", data: D.trend.sales.map(v => v * f), borderColor: blue, backgroundColor: blueSoft, fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
            { label: "毛利", data: D.trend.profit.map(v => v * f), borderColor: green, backgroundColor: "rgba(15,157,99,.06)", fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 }
          ]
        },
        options: {
          plugins: { legend: { display: true, position: "top", align: "end", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: "#64748b", font: { size: 11 } } } },
          scales: { y: { ticks: { callback: v => "¥" + (v / 1000) + "k" } } }
        }
      });
      const c2 = document.getElementById("cCash");
      if (c2) addChart(c2, {
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
          scales: { y: { ticks: { callback: v => "¥" + (v / 10000) + "万" } } }
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
          scales: { y: { ticks: { callback: v => "¥" + (v / 10000) + "万" } } }
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

  /* ---------------- router ---------------- */
  const views = { overview, cash, goods, sales, product, import: importer, account };

  function render() {
    const route = (location.hash.replace(/^#\//, "") || "overview").split("?")[0];
    state.route = views[route] ? route : "overview";
    document.getElementById("view").innerHTML = views[state.route]();
    const t = titles[state.route];
    document.getElementById("pageTitle").textContent = t[0];
    document.getElementById("pageDesc").textContent = t[1];
    document.querySelectorAll(".nav-item").forEach(a => a.classList.toggle("active", a.dataset.route === state.route));
    window.scrollTo({ top: 0 });
    draw();
  }

  /* ---------------- events ---------------- */
  window.addEventListener("hashchange", render);

  document.getElementById("fStore").addEventListener("change", (e) => { state.store = e.target.value; render(); });
  document.getElementById("fSite").addEventListener("change", (e) => { state.site = e.target.value; render(); });
  document.getElementById("fPeriod").addEventListener("change", (e) => { state.period = e.target.value; render(); });
  const btn = document.getElementById("btnCompare");
  btn.classList.add("on");
  btn.addEventListener("click", () => {
    state.compare = !state.compare;
    btn.classList.toggle("on", state.compare);
    btn.textContent = "对比上期：" + (state.compare ? "开" : "关");
    render();
  });

  render();
})();
