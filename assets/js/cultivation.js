{
  const { acquisition, steps, shardsPerVisit, visitsPerDay } = UR_CULTIVATION_CONFIG;
  const levels = [acquisition.to, ...steps.map((step) => step.to)];
  const storageKey = "cassell.cultivation.v1";
  const materials = [
    { key: "shards", name: "角色碎片", input: "growth-shards" },
    { key: "awakeningStones", name: "觉醒石", input: "growth-awakening" },
    { key: "transcendStones", name: "超限石", input: "growth-transcend" },
  ];

  const currentSelect = document.getElementById("growth-current");
  const targetSelect = document.getElementById("growth-target");
  const route = document.getElementById("growth-route");
  const result = document.getElementById("growth-result");
  const outcome = document.getElementById("growth-outcome");
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

  function updateTargetOptions(target) {
    const current = Number(currentSelect.value);
    targetSelect.innerHTML = levels.slice(current).map((level, i) => levelOption(level, i + current)).join("");
    targetSelect.value = String(Math.max(current, target));
  }

  function visitText(shardGap) {
    const visits = Math.ceil(shardGap / shardsPerVisit);
    if (!visits) return "无需拜访";
    const days = Math.ceil(visits / visitsPerDay);
    const lastDayVisits = visits % visitsPerDay;
    const lastDay = days > 1 && lastDayVisits ? `，最后一天 ${lastDayVisits} 次` : "";
    return `碎片拜访 ${visits} 次（${days} 天${lastDay}）`;
  }

  const numberText = (count) => count.toLocaleString("zh-CN");

  function materialProgress(total, owned, level, showUnused = false) {
    return materials.map(({ key, name }, i) => {
      const needed = total[i];
      if (!needed && !showUnused) return "";
      const covered = Math.min(owned[i], needed);
      const gap = needed - covered;
      return `
        <div class="growth-material growth-${key}">
          <div class="growth-material-line">
            <span>${name}</span>
            <span>${needed ? `<b${gap ? ' class="growth-gap"' : ""}>${gap ? `缺 ${numberText(gap)}` : "已备齐"}</b>` : "无需"}</span>
          </div>
          ${needed ? `
            <progress aria-label="${level}·${name}" value="${covered}" max="${needed}"></progress>
            <small>${numberText(covered)} / ${numberText(needed)}</small>` : ""}
        </div>`;
    }).join("");
  }

  function renderCultivation() {
    const current = Number(currentSelect.value);
    const target = Number(targetSelect.value);
    const owned = inventoryInputs.map((input) => normalizeCount(input.value));
    const totals = [[0, 0, 0]];
    for (const step of steps.slice(current)) {
      const previous = totals[totals.length - 1];
      totals.push(materials.map(({ key }, i) => previous[i] + step[key]));
    }
    const targetTotal = totals[target - current];
    route.textContent = `${levels[current]} → ${levels[target]}`;
    result.innerHTML = materialProgress(targetTotal, owned, `目标${levels[target]}`, true);

    const missingShards = Math.max(0, targetTotal[0] - owned[0]);
    const ready = targetTotal.every((count, i) => count <= owned[i]);
    outcome.textContent = current === target ? "当前已是目标等级。" :
      ready ? "材料已备齐，无需拜访。" : `${visitText(missingShards)}。`;

    roadmap.innerHTML = totals.slice(1).map((total, i) => {
      const index = current + i + 1;
      const level = levels[index];
      const isTarget = index === target;
      return `
        <li class="growth-milestone${isTarget ? " is-target" : ""}">
          <div class="growth-milestone-head">
            <h3>${level}</h3>${isTarget ? '<span class="badge">目标</span>' : ""}
          </div>
          <div class="growth-milestone-materials">${materialProgress(total, owned, level)}</div>
          <div class="growth-milestone-visits">${visitText(Math.max(0, total[0] - owned[0]))}</div>
        </li>`;
    }).join("");
    if (current === levels.length - 1) {
      roadmap.innerHTML = '<li class="growth-complete">当前已是最高等级，不需要继续升级。</li>';
    }
  }

  function restoreCultivation() {
    let plan;
    try {
      plan = JSON.parse(localStorage.getItem(storageKey));
    } catch { /* 无法读取时仍可计算 */ }

    const validLevel = (index) => Number.isInteger(index) && index >= 0 && index < levels.length;
    currentSelect.value = validLevel(plan?.current) ? String(plan.current) : "0";
    updateTargetOptions(validLevel(plan?.target) ? plan.target : levels.length - 1);
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
        target: Number(targetSelect.value),
        inventory,
      }));
    } catch { /* 无法保存时仍可计算 */ }
    renderCultivation();
  }

  restoreCultivation();
  renderCultivation();

  currentSelect.addEventListener("change", () => {
    updateTargetOptions(Number(targetSelect.value));
    updateCultivation();
  });
  targetSelect.addEventListener("change", updateCultivation);
  inventoryInputs.forEach((input) => {
    input.addEventListener("input", updateCultivation);
    input.addEventListener("change", () => {
      if (input.value !== "") input.value = String(normalizeCount(input.value));
      updateCultivation();
    });
  });
}
