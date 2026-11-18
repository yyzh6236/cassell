{
  const { acquisition, steps, shardsPerCopy, shardsPerVisit, visitsPerDay } = UR_CULTIVATION_CONFIG;
  const levels = [acquisition.to, ...steps.map((step) => step.to)];
  const storageKey = "cassell.cultivation.v1";
  const materials = [
    { key: "shards", name: "碎片", input: "growth-shards" },
    { key: "awakeningStones", name: "觉醒石", input: "growth-awakening" },
    { key: "transcendStones", name: "超限石", input: "growth-transcend" },
  ];

  const currentSelect = document.getElementById("growth-current");
  const roadmap = document.getElementById("growth-roadmap");
  const inventoryInputs = materials.map(({ input }) => document.getElementById(input));

  const tabs = ["tab-pulls", "tab-growth"].map((id) => document.getElementById(id));
  const mobileSummary = document.getElementById("mobile-summary");

  function selectCalculator(index) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
    });
    mobileSummary.hidden = index !== 0;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectCalculator(index));
    tab.addEventListener("keydown", (event) => {
      const { key } = event;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      event.preventDefault();
      const next = key === "Home" ? 0 : key === "End" ? tabs.length - 1 : 1 - index;
      selectCalculator(next);
      tabs[next].focus();
    });
  });

  const levelOption = (level, index) => `<option value="${index}">${level}</option>`;
  currentSelect.innerHTML = levels.map(levelOption).join("");

  function visitText(shardGap) {
    const visits = Math.ceil(shardGap / shardsPerVisit);
    if (!visits) return "无需拜访";
    const days = Math.ceil(visits / visitsPerDay);
    const lastDayVisits = visits % visitsPerDay;
    const lastDay = days > 1 && lastDayVisits ? `，最后一天 ${lastDayVisits} 次` : "";
    return `碎片拜访 ${visits} 次（${days} 天${lastDay}）`;
  }

  function shardEquivalent(shards) {
    const copies = Math.floor(shards / shardsPerCopy);
    if (!copies) return "";
    const remainder = shards % shardsPerCopy;
    return `（${copies.toLocaleString("zh-CN")} 只本体${remainder ? ` + ${remainder} 碎片` : ""}）`;
  }

  function renderCultivation() {
    const current = Number(currentSelect.value);
    const owned = inventoryInputs.map((input) => normalizeCount(input.value));
    const totals = materials.map(() => 0);
    const currentStatus = current === steps.length ? "当前已是最高等级" : "当前等级";
    const rows = [`
      <li class="growth-step is-current" aria-current="step">
        <strong>${levels[current]}</strong>
        <span class="growth-step-status">${currentStatus}</span>
      </li>`];
    for (const step of steps.slice(current)) {
      const gaps = materials.map(({ key }, i) => {
        totals[i] += step[key];
        return Math.max(0, totals[i] - owned[i]);
      });
      const missing = materials.flatMap(({ key, name }, i) => {
        const gap = gaps[i];
        if (!gap) return [];
        const equivalent = key === "shards" ? shardEquivalent(gap) : "";
        return [`${gap.toLocaleString("zh-CN")} ${name}${equivalent}`];
      });
      rows.push(`
        <li class="growth-step${missing.length ? "" : " is-ready"}">
          <strong>${step.to}</strong>
          ${missing.length ? `
            <div class="growth-step-details">
              <span class="growth-step-gap">缺 ${missing.join("、")}</span>
              <span class="growth-step-visits">${visitText(gaps[0])}</span>
            </div>` : '<span class="growth-step-status">材料已备齐</span>'}
        </li>`);
    }
    roadmap.innerHTML = rows.join("");
  }

  function restoreCultivation() {
    let plan;
    try {
      plan = JSON.parse(localStorage.getItem(storageKey));
    } catch { /* 无法读取时仍可计算 */ }

    const validLevel = (index) => Number.isInteger(index) && index >= 0 && index < levels.length;
    currentSelect.value = validLevel(plan?.current) ? String(plan.current) : "0";
    materials.forEach(({ key }, i) => {
      const value = plan?.inventory?.[key];
      inventoryInputs[i].value = Number.isSafeInteger(value) && value >= 0 ? String(value) : "";
    });
  }

  function updateCultivation() {
    const inventory = Object.fromEntries(materials.map(({ key }, i) => {
      const value = inventoryInputs[i].value;
      return [key, value === "" ? null : normalizeCount(value)];
    }));
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        current: Number(currentSelect.value),
        inventory,
      }));
    } catch { /* 无法保存时仍可计算 */ }
    renderCultivation();
  }

  restoreCultivation();
  renderCultivation();

  currentSelect.addEventListener("change", updateCultivation);
  inventoryInputs.forEach((input) => {
    input.addEventListener("input", updateCultivation);
    input.addEventListener("change", () => {
      if (input.value !== "") input.value = String(normalizeCount(input.value));
      updateCultivation();
    });
  });
}
