function isInputSource(s) {
  return s.kind === "tickets" || s.kind === "pulls" || s.kind === "checkin";
}

function hasPurchaseLimit(s) {
  return Number.isFinite(s.max);
}

function isQtySource(s) {
  return !hasPurchaseLimit(s) || s.max > 1;
}

function limitHint(s) {
  if (!s.cost) return "免费 · 可选";
  return money(s.cost) + " / 次 · " + (hasPurchaseLimit(s) ? "限购 " + s.max : "不限购");
}

// on = 是否计入方案；value = 礼包次数 / 券数量 / 兑换抽数 / 已签到天数
const state = Object.fromEntries(
  SOURCES.map((s) => [s.id, { on: false, value: s.defaultValue ?? (isInputSource(s) ? 0 : 1) }])
);
let alreadyPulls = 0;
let alreadyPullsEnabled = true;

const STORAGE_KEY = "cassell.plan.v1";
let storageAvailable = true;

function restorePlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || ![1, 2].includes(saved.version) || !saved.sources || typeof saved.sources !== "object") return;
    if (Number.isSafeInteger(saved.alreadyPulls) && saved.alreadyPulls >= 0) alreadyPulls = saved.alreadyPulls;
    alreadyPullsEnabled = typeof saved.alreadyPullsEnabled === "boolean" ? saved.alreadyPullsEnabled : true;
    for (const s of SOURCES) {
      const entry = saved.sources[s.id];
      if (!entry || typeof entry.on !== "boolean" || !Number.isSafeInteger(entry.value) || entry.value < 0) continue;
      state[s.id] = {
        on: entry.on,
        value: saved.version === 1 && ["pulls", "checkin"].includes(s.kind)
          ? s.defaultValue : normalizeSourceCount(s, entry.value),
      };
    }
  } catch { /* 损坏或不可访问的数据不影响计算 */ }
}

function savePlan() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, alreadyPulls, alreadyPullsEnabled, sources: state }));
    storageAvailable = true;
  } catch { storageAvailable = false; }
  document.getElementById("save-status").textContent = storageAvailable
    ? "已自动保存在此浏览器" : "当前浏览器无法保存，关闭页面后填写可能丢失";
}

function normalizeCount(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(n))) : 0;
}

function normalizeSourceCount(s, raw) {
  const count = normalizeCount(raw);
  if (s.kind === "checkin") return Math.min(s.totalDays, count);
  if (s.kind === "pulls" && hasTicketCap(s)) return Math.min(s.maxPulls, count);
  return hasPurchaseLimit(s) ? Math.min(s.max, count) : count;
}

const elAlreadyPulls = document.getElementById("u");
const elAlreadyEnabled = document.getElementById("enable-u");
const elSources = document.getElementById("sources");
const elMilestones = document.getElementById("milestones");
const elTotalPulls = document.getElementById("total-pulls");
const elTotalCost = document.getElementById("total-cost");
const elUnitPrice = document.getElementById("unit-price");
const elGapNote = document.getElementById("gap-note");

function money(n) {
  return "¥" + n.toLocaleString("zh-CN");
}

function unitPriceText(cost, pulls) {
  if (!pulls || !cost) return "—";
  return "¥" + (cost / pulls).toFixed(2);
}

function hasTicketCap(s) {
  return Number.isFinite(s.maxPulls);
}

function ticketEffectivePulls(s, tickets) {
  if (s.kind === "checkin") return Math.max(0, s.totalDays - normalizeCount(tickets)) * s.pullsPerDay;
  const raw = Math.floor(Math.max(0, tickets) / (s.ticketRatio || 1));
  return hasTicketCap(s) ? Math.min(raw, s.maxPulls) : raw;
}

function ticketAtCap(s, tickets) {
  return hasTicketCap(s) && ticketEffectivePulls(s, tickets) >= s.maxPulls;
}

function ticketSubLabel(s) {
  if (s.hint) return s.hint;
  if (hasTicketCap(s)) {
    const maxTickets = s.maxPulls * s.ticketRatio;
    return `${s.ticketRatio} ${s.unit} = 1 抽 · 上限 ${s.maxPulls} 抽（${maxTickets} 券）`;
  }
  return `${s.ticketRatio} ${s.unit} = 1 抽`;
}

function ticketMetaHint(s, st) {
  if (!st.on) return "勾选后计入";
  if (s.kind === "checkin") return `已签到 ${st.value} 天 · 剩余 ${s.totalDays - st.value} 天`;
  if (s.kind === "pulls") return `消耗 ${(st.value * s.diamondsPerPull).toLocaleString("zh-CN")} 钻石`;
  if (ticketAtCap(s, st.value)) {
    return `<span class="hint-cap">已达上限</span>（按 ${s.maxPulls} 抽计）`;
  }
  return `${s.ticketRatio} 券 = 1 抽`;
}

function inputPullsLabel(s, st) {
  if (!st.on) return "未启用";
  const pulls = ticketEffectivePulls(s, st.value);
  if (s.kind === "checkin") return pulls ? `还可领 ${pulls} 抽` : "已全部领取";
  return pulls ? `+${pulls} 抽` : "未计入";
}

function sourcePulls(s) {
  const st = state[s.id];
  if (!st.on) return 0;
  if (isInputSource(s)) return ticketEffectivePulls(s, st.value);
  return s.pulls * st.value;
}

function sourceCost(s) {
  const st = state[s.id];
  if (!st.on || isInputSource(s)) return 0;
  return s.cost * st.value;
}

function setEnabled(id, on) {
  const src = SOURCES.find((s) => s.id === id);
  const st = state[id];
  st.on = !!on;
  // 勾选可调次数礼包时若次数为 0，默认给 1 次，方便直接计入
  if (st.on && !isInputSource(src) && isQtySource(src) && st.value < 1) st.value = 1;
  render();
}

function setCount(id, next) {
  const src = SOURCES.find((s) => s.id === id);
  state[id].value = normalizeSourceCount(src, next);
  render();
}

function setTicketCount(id, raw) {
  const s = SOURCES.find((x) => x.id === id);
  state[id].value = normalizeSourceCount(s, raw);
  if (state[id].value !== Number(raw)) {
    const input = elSources.querySelector(`[data-ticket-input][data-id="${id}"]`);
    if (input) input.value = state[id].value;
  }
  // 输入时不全量重绘，避免光标丢失
  savePlan();
  updateTicketRow(s);
  renderSummary();
}

function updateTicketRow(s) {
  const st = state[s.id];
  const row = elSources.querySelector(`[data-ticket-row="${s.id}"]`);
  if (!row) return;
  const pullsEl = row.querySelector("[data-ticket-pulls]");
  const hintEl = row.querySelector("[data-ticket-hint]");
  if (pullsEl) {
    pullsEl.textContent = inputPullsLabel(s, st);
  }
  if (hintEl) hintEl.innerHTML = ticketMetaHint(s, st);
}

function renderTicketRow(s) {
  const st = state[s.id];
  const tickets = st.value;
  const inputLabel = s.kind === "checkin" ? "已签到天数" : s.kind === "pulls" ? "兑换抽数" : "持有数量";

  return `
    <div class="row ssr-row ${st.on ? "" : "is-off"}" data-ticket-row="${s.id}">
      <input type="checkbox" id="enable-${s.id}" data-enable="${s.id}" ${st.on ? "checked" : ""} aria-label="启用 ${s.name}" />
      <label class="name" for="enable-${s.id}">
        <strong>${s.name}</strong>
        <span>${ticketSubLabel(s)}</span>
      </label>
      <div class="meta">
        <b data-ticket-pulls>${inputPullsLabel(s, st)}</b>
        <span data-ticket-hint>${ticketMetaHint(s, st)}</span>
      </div>
      <input
        class="ticket-input"
        type="number"
        min="0"
        step="1"
        ${s.kind === "pulls" ? `max="${s.maxPulls}"` : ""}
        ${s.kind === "checkin" ? `max="${s.totalDays}"` : ""}
        inputmode="numeric"
        data-ticket-input
        data-id="${s.id}"
        value="${tickets || (s.kind === "checkin" ? "0" : "")}"
        placeholder="${inputLabel}"
        aria-label="${s.name}${inputLabel}"
      />
    </div>
  `;
}

function renderSources() {
  const free = SOURCES.filter((s) => s.group === "free");
  const paid = SOURCES.filter((s) => s.group === "paid");

  const block = (title, list) => {
    const rows = list.map((s) => {
      if (isInputSource(s)) return renderTicketRow(s);

      const st = state[s.id];
      const count = st.value;
      const on = st.on;
      const isQty = isQtySource(s);
      const atMax = hasPurchaseLimit(s) && count >= s.max;
      const appliedPulls = on ? s.pulls * count : 0;
      const qtyHint = hasPurchaseLimit(s)
        ? `限购 ${s.max} · 已选 ${count}`
        : `不限购 · 已选 ${count}`;

      const checkbox = `<input type="checkbox" id="enable-${s.id}" data-enable="${s.id}" ${on ? "checked" : ""} aria-label="启用 ${s.name}" />`;
      const stepper = isQty
        ? `<div class="stepper">
            <button type="button" aria-label="减少 ${s.name}次数" data-action="dec" data-id="${s.id}" ${count <= 0 ? "disabled" : ""}>−</button>
            <div class="count">${count}</div>
            <button type="button" aria-label="增加 ${s.name}次数" data-action="inc" data-id="${s.id}" ${atMax ? "disabled" : ""}>+</button>
          </div>`
        : `<div class="meta"><b>${money(s.cost)}</b>单次</div>`;

      return `
        <div class="row ${on ? "" : "is-off"}">
          ${checkbox}
          <label class="name" for="enable-${s.id}">
            <strong>${s.name}</strong>
            <span>${limitHint(s)}</span>
          </label>
          <div class="meta">
            <b>${on ? `+${appliedPulls} 抽` : `每次 ${s.pulls} 抽`}</b>
            ${on ? (isQty ? qtyHint : money(s.cost)) : "勾选后计入"}
          </div>
          ${stepper}
        </div>
      `;
    }).join("");

    return `<div class="section-title">${title}</div>${rows}`;
  };

  elSources.innerHTML = block("免费途径", free) + block("付费礼包", paid);
}

function calc() {
  let pulls = alreadyPullsEnabled ? alreadyPulls : 0;
  let cost = 0;
  for (const s of SOURCES) {
    pulls += sourcePulls(s);
    cost += sourceCost(s);
  }
  return { pulls, cost };
}

function renderSummary() {
  const { pulls, cost } = calc();
  const appliedAlready = alreadyPullsEnabled ? alreadyPulls : 0;
  elAlreadyEnabled.checked = alreadyPullsEnabled;
  document.getElementById("history-row").classList.toggle("is-off", !alreadyPullsEnabled);
  elTotalPulls.textContent = pulls.toLocaleString("zh-CN");
  elTotalCost.textContent = money(cost);
  elUnitPrice.textContent = unitPriceText(cost, pulls - appliedAlready);
  document.getElementById("pulls-breakdown").textContent = `已抽 ${appliedAlready.toLocaleString("zh-CN")} + 计划 ${(pulls - appliedAlready).toLocaleString("zh-CN")}`;
  document.getElementById("mobile-pulls").textContent = pulls.toLocaleString("zh-CN");
  document.getElementById("mobile-cost").textContent = money(cost);

  const sorted = [...MILESTONES].sort((a, b) => a.pulls - b.pulls);
  elMilestones.innerHTML = sorted.map((m) => {
    const hit = pulls >= m.pulls;
    const remain = Math.max(0, m.pulls - pulls);
    return `
      <div class="milestone ${hit ? "hit" : ""}">
        <div class="left">
          <strong>${m.reward}</strong>
          <span>累计 ${m.pulls} 抽${hit ? "" : ` · 还差 ${remain}`}</span>
        </div>
        <div class="badge">${hit ? "已达成" : "未达成"}</div>
      </div>
    `;
  }).join("") || `<div class="gap-note">暂无累计奖励</div>`;

  const next = sorted.find((m) => pulls < m.pulls);
  if (!sorted.length) {
    elGapNote.textContent = "暂无累计奖励信息。";
  } else if (!next) {
    elGapNote.textContent = "当前方案已达成专武奖励。";
  } else {
    elGapNote.innerHTML = `距离下一档「${next.reward}」还差 <b>${next.pulls - pulls}</b> 抽。`;
  }
  renderShopRewards(pulls);
}

function render() {
  const active = document.activeElement;
  const keepTicket = active && active.matches && active.matches("[data-ticket-input]");
  const keepId = keepTicket ? active.dataset.id : null;
  const selStart = keepTicket ? active.selectionStart : null;
  const selEnd = keepTicket ? active.selectionEnd : null;

  renderSources();
  renderSummary();
  savePlan();

  if (keepId) {
    const input = elSources.querySelector(`[data-ticket-input][data-id="${keepId}"]`);
    if (input) {
      input.focus();
      if (selStart != null) input.setSelectionRange(selStart, selEnd);
    }
  }
}

elAlreadyEnabled.addEventListener("change", () => {
  alreadyPullsEnabled = elAlreadyEnabled.checked;
  savePlan();
  renderSummary();
});

elAlreadyPulls.addEventListener("input", () => {
  alreadyPulls = normalizeCount(elAlreadyPulls.value);
  if (alreadyPulls !== Number(elAlreadyPulls.value)) elAlreadyPulls.value = alreadyPulls;
  savePlan();
  renderSummary();
});

elSources.addEventListener("change", (e) => {
  const t = e.target;
  if (t.matches("input[data-enable]")) {
    setEnabled(t.dataset.enable, t.checked);
  }
});

elSources.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches("[data-ticket-input]")) {
    setTicketCount(t.dataset.id, t.value);
  }
});

elSources.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const cur = state[id].value;
  setCount(id, btn.dataset.action === "inc" ? cur + 1 : cur - 1);
});

function freeToggleSources() {
  return SOURCES.filter((s) => s.group === "free" && !isInputSource(s));
}

document.getElementById("btn-all-free").addEventListener("click", () => {
  SOURCES.filter((s) => s.group === "free").forEach((s) => { state[s.id].on = true; });
  render();
});

document.getElementById("btn-clear-free").addEventListener("click", () => {
  SOURCES.filter((s) => s.group === "free").forEach((s) => { state[s.id].on = false; });
  render();
});

document.getElementById("btn-clear-paid").addEventListener("click", () => {
  SOURCES.filter((s) => s.group === "paid").forEach((s) => { state[s.id].on = false; });
  render();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  alreadyPulls = 0;
  alreadyPullsEnabled = false;
  elAlreadyPulls.value = "";
  SOURCES.forEach((s) => {
    state[s.id].on = false;
    state[s.id].value = s.defaultValue ?? (isInputSource(s) ? 0 : 1);
  });
  render();
});

function renderCultivateRewards() {
  const el = document.getElementById("cultivate-rewards");
  const cell = (text) =>
    text == null
      ? `<span class="unknown">？</span>`
      : text;
  el.innerHTML = CULTIVATE_REWARDS.map(
    (r) => `<tr>
      <td class="lv">觉${r.level}</td>
      <td class="reward">${cell(r.awaken)}</td>
      <td class="lv split">超${r.level}</td>
      <td class="reward">${cell(r.transcend)}</td>
    </tr>`
  ).join("");
}

function renderShopRewards(pulls) {
  document.getElementById("shop-rewards").innerHTML = SHOP_REWARDS.map((r) => {
    const hit = pulls >= r.pulls;
    return `<tr class="${hit ? "hit" : ""}"${r.reward === "专武" ? " data-weapon-reward" : ""}>
      <td class="shop-pulls">${r.pulls}抽</td>
      <td>${r.reward}</td>
      <td class="shop-status"><span class="badge">${hit ? "已达成" : "未达成"}</span></td>
    </tr>`;
  }).join("");
}

const rewardTabs = [...document.querySelectorAll('#reward-tabs [role="tab"]')];

function selectRewardTab(selected) {
  rewardTabs.forEach((tab) => {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
  });
}

document.getElementById("reward-tabs").addEventListener("click", (e) => {
  const tab = e.target.closest('[role="tab"]');
  if (tab) selectRewardTab(tab);
});

document.getElementById("reward-tabs").addEventListener("keydown", (e) => {
  const index = rewardTabs.indexOf(e.target);
  if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const next = e.key === "Home" ? 0 : e.key === "End" ? rewardTabs.length - 1
    : (index + (e.key === "ArrowRight" ? 1 : -1) + rewardTabs.length) % rewardTabs.length;
  selectRewardTab(rewardTabs[next]);
  rewardTabs[next].focus();
});

DEFAULT_ENABLED.forEach((id) => {
  if (state[id]) state[id].on = true;
});
restorePlan();
elAlreadyPulls.value = alreadyPulls || "";
renderCultivateRewards();
render();
