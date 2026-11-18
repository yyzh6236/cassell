const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const html = read("index.html");
const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
  innerHTML: "", textContent: "", listeners: {}, attributes: {},
  classList: { toggle() {} },
  addEventListener(type, listener) { this.listeners[type] = listener; },
  setAttribute(name, value) { this.attributes[name] = value; },
  getAttribute(name) { return this.attributes[name]; },
  querySelector() { return null; },
  closest(selector) { return selector === '[role="tab"]' ? this : null; },
  focus() { document.activeElement = this; },
}]));
const document = {
  activeElement: null,
  getElementById(id) { assert.ok(elements.has(id), `页面缺少 ${id}`); return elements.get(id); },
  querySelectorAll(selector) {
    assert.equal(selector, '#reward-tabs [role="tab"]');
    return tabs;
  },
};
const readTabs = (markup) => [...markup.matchAll(/<button[^>]+role="tab"[^>]*>/g)].map(([tag]) => {
  const el = document.getElementById(tag.match(/id="([^"]+)"/)[1]);
  for (const [, name, value] of tag.matchAll(/([\w-]+)="([^"]*)"/g)) el.setAttribute(name, value);
  el.tabIndex = Number(el.getAttribute("tabindex") || 0);
  document.getElementById(el.getAttribute("aria-controls")).hidden = el.getAttribute("aria-selected") !== "true";
  return el;
});
const tabs = readTabs(html.split('id="reward-tabs"')[1].split("</div>")[0]);
const calculatorTabs = readTabs(html.split('id="calculator-tabs"')[1].split("</div>")[0]);
const storage = new Map();
const context = vm.createContext({ document, localStorage: {
  getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); },
} });
vm.runInContext(read("assets/js/config.js") + "\n" + read("assets/js/app.js"), context);
const run = (code) => vm.runInContext(code, context);
const shop = document.getElementById("shop-rewards");
assert.equal(run("state.diamond.value"), 50);
assert.equal(run("state.checkin0.value"), 0);
assert.equal(run("calc().pulls"), 200);
const expected = [
  [200, "SSR全基础龙文任选 ×1"], [300, "超限石 ×3"],
  [400, "橙色核心任选 ×1"], [500, "超限石 ×4"],
  [600, "专武"], [650, "超限石 ×5"],
  [700, "SSR全基础龙文任选 ×1 + SSR全光暗龙文任选"],
];
assert.deepEqual(JSON.parse(run("JSON.stringify(SHOP_REWARDS.map(r => [r.pulls, r.reward]))")), expected);
assert.deepEqual(JSON.parse(run("JSON.stringify(MILESTONES)")), [{ pulls: 600, reward: "专武" }]);
for (const [pulls, reward] of expected) assert.ok(read("docs/config-notes.md").includes(`- ${pulls} 抽：${reward}`));

const checkTab = (index) => tabs.forEach((tab, i) => {
  assert.equal(tab.getAttribute("aria-selected"), String(i === index));
  assert.equal(tab.tabIndex, i === index ? 0 : -1);
  assert.equal(document.getElementById(tab.getAttribute("aria-controls")).hidden, i !== index);
});
checkTab(0);
const before = run("JSON.stringify(calc())");
document.getElementById("reward-tabs").listeners.click({ target: tabs[1] });
checkTab(1);
assert.equal(run("JSON.stringify(calc())"), before);
for (const [key, index] of [["ArrowRight", 0], ["ArrowLeft", 1], ["Home", 0], ["End", 1]]) {
  let prevented = false;
  document.getElementById("reward-tabs").listeners.keydown({
    target: tabs.find((tab) => tab.tabIndex === 0), key, preventDefault() { prevented = true; },
  });
  checkTab(index);
  assert.ok(prevented);
  assert.equal(document.activeElement, tabs[index]);
}

run("SOURCES.forEach(s => { state[s.id].on = false; }); state.urStock.on = true;");
for (const pulls of [0, ...expected.flatMap(([n]) => [n - 1, n]), 701]) {
  run(`setTicketCount("urStock", ${pulls})`);
  assert.equal(document.getElementById("total-pulls").textContent, String(pulls));
  assert.equal(document.getElementById("total-cost").textContent, "¥0");
  assert.equal((shop.innerHTML.match(/<tr /g) || []).length, 7);
  assert.equal((shop.innerHTML.match(/class="hit"/g) || []).length, expected.filter(([n]) => n <= pulls).length);
  const weaponRow = shop.innerHTML.match(/<tr[^>]*data-weapon-reward[^>]*>[\s\S]*?<\/tr>/g);
  assert.equal(weaponRow.length, 1);
  assert.ok(weaponRow[0].includes("600抽") && weaponRow[0].includes("专武"));
  assert.ok(weaponRow[0].includes(pulls >= 600 ? "已达成" : "未达成"));
  assert.equal(document.getElementById("milestones").innerHTML.includes('class="milestone hit"'), pulls >= 600);
  checkTab(1);
}
assert.equal(document.getElementById("gap-note").textContent, "当前方案已达成专武奖励。");

const history = document.getElementById("u");
const historyEnabled = document.getElementById("enable-u");
const toggleHistory = (enabled) => {
  historyEnabled.checked = enabled;
  historyEnabled.listeners.change();
};
assert.equal(historyEnabled.checked, true);
const setHistory = (value) => {
  history.value = value;
  history.listeners.input();
};
const click = (id) => { document.activeElement = null; document.getElementById(id).listeners.click(); };
assert.ok(html.indexOf('id="u"') < html.indexOf('id="sources"'));
click("btn-reset");
toggleHistory(true);
setHistory("400");
run("setEnabled('urStock', true); setTicketCount('urStock', 200); setEnabled('checkin88', true);");
assert.equal(run("calc().pulls"), 650);
assert.equal(document.getElementById("pulls-breakdown").textContent, "已抽 400 + 计划 250");
assert.equal(document.getElementById("unit-price").textContent, "¥0.35");
toggleHistory(false);
assert.equal(run("calc().pulls"), 250);
assert.equal(history.value, "400");
assert.equal(document.getElementById("pulls-breakdown").textContent, "已抽 0 + 计划 250");
assert.equal(document.getElementById("unit-price").textContent, "¥0.35");
assert.equal(document.getElementById("milestones").innerHTML.includes('class="milestone hit"'), false);
assert.equal(document.getElementById("mobile-pulls").textContent, "250");
run("alreadyPullsEnabled = true; restorePlan(); renderSummary();");
assert.equal(historyEnabled.checked, false);
assert.equal(run("alreadyPulls"), 400);
assert.equal(run("calc().pulls"), 250);
toggleHistory(true);
assert.equal(run("calc().pulls"), 650);
assert.equal(document.getElementById("milestones").innerHTML.includes('class="milestone hit"'), true);
click("btn-clear-free");
click("btn-clear-paid");
assert.equal(run("calc().pulls"), 400);
assert.equal(document.getElementById("unit-price").textContent, "—");

run("setEnabled('checkin0', true)");
document.getElementById("sources").listeners.input({ target: {
  matches(selector) { return selector === "[data-ticket-input]"; },
  dataset: { id: "checkin0" }, value: "3",
} });
assert.equal(run("calc().pulls"), 404);
assert.equal(run("inputPullsLabel(SOURCES.find(s => s.id === 'checkin0'), state.checkin0)"), "还可领 4 抽");
assert.ok(document.getElementById("sources").innerHTML.includes('aria-label="0元签到已签到天数"'));
run("setTicketCount('checkin0', 9)");
assert.equal(run("state.checkin0.value"), 7);
assert.equal(run("calc().pulls"), 400);
run("setTicketCount('checkin0', 2.9)");
assert.equal(run("state.checkin0.value"), 2);

run("setEnabled('diamond', true); setTicketCount('diamond', 20)");
assert.equal(run("calc().pulls"), 425);
assert.equal(run("ticketMetaHint(SOURCES.find(s => s.id === 'diamond'), state.diamond)"), "消耗 10,000 钻石");
run("setTicketCount('diamond', 100)");
assert.equal(run("state.diamond.value"), 50);
run("setTicketCount('diamond', -1)");
assert.equal(run("state.diamond.value"), 0);
run("setTicketCount('diamond', 12); savePlan(); alreadyPulls = 0; state.diamond.value = 0; state.checkin0.value = 7; restorePlan();");
assert.equal(run("alreadyPulls"), 400);
assert.equal(run("state.diamond.value"), 12);
assert.equal(run("state.checkin0.value"), 2);

storage.set("cassell.plan.v1", JSON.stringify({ version: 1, sources: {
  diamond: { on: true, value: 1 }, checkin0: { on: true, value: 1 }, urStock: { on: true, value: 123 },
} }));
run("alreadyPulls = 0; restorePlan();");
assert.equal(run("state.diamond.value"), 50);
assert.equal(run("state.checkin0.value"), 0);
assert.equal(run("state.urStock.value"), 123);
assert.equal(run("alreadyPullsEnabled"), true);
setHistory("-10");
assert.equal(run("alreadyPulls"), 0);
setHistory("12.9");
assert.equal(run("alreadyPulls"), 12);
click("btn-reset");
assert.equal(run("calc().pulls"), 0);
assert.equal(history.value, "");
assert.equal(run("state.diamond.value"), 50);
assert.equal(run("state.checkin0.value"), 0);
assert.equal(JSON.parse(storage.get("cassell.plan.v1")).alreadyPulls, 0);
assert.equal(historyEnabled.checked, false);
assert.equal(JSON.parse(storage.get("cassell.plan.v1")).alreadyPullsEnabled, false);
console.log("通过：奖励及专武高亮、标签切换、已抽进度、签到剩余抽数、钻石兑换、自动保存与旧方案兼容。");


for (const file of ["cultivation-config.js", "cultivation.js"]) {
  assert.ok(html.includes(`src="assets/js/${file}"`));
  run(read(`assets/js/${file}`));
}

const el = (id) => document.getElementById(id);
const setGrowth = (id, value, type = "change") => {
  el(`growth-${id}`).value = String(value);
  el(`growth-${id}`).listeners[type]();
};
const calcBefore = run("JSON.stringify(calc())");
calculatorTabs[1].listeners.click();
assert.equal(el("calculator-pulls").hidden, true);
assert.equal(el("mobile-summary").hidden, true);
assert.equal(el("calculator-growth").hidden, false);
assert.equal(el("growth-route").textContent, "觉0 → 超5");
assert.match(el("growth-result").innerHTML, /缺 3,300/);

setGrowth("current", 4);
setGrowth("target", 6);
setGrowth("shards", 684, "input");
setGrowth("awakening", 1, "input");
setGrowth("transcend", 2, "input");
assert.equal(el("growth-route").textContent, "觉4 → 超1");
assert.match(el("growth-result").innerHTML, /缺 16/);
assert.match(el("growth-result").innerHTML, /缺 3/);
assert.match(el("growth-result").innerHTML, /缺 1/);
assert.match(el("growth-result").innerHTML, /value="684" max="700"/);
assert.equal(el("growth-outcome").textContent, "碎片拜访 4 次（2 天，最后一天 1 次）。");
assert.match(el("growth-roadmap").innerHTML, /觉5[\s\S]*?无需拜访/);
assert.match(el("growth-roadmap").innerHTML, /class="growth-milestone is-target"[\s\S]*?<h3>超1<\/h3>/);
assert.match(el("growth-roadmap").innerHTML, /<h3>超5<\/h3>/);

for (const [shards, expected] of [
  [694, "碎片拜访 2 次（1 天）。"],
  [695, "碎片拜访 1 次（1 天）。"],
  [685, "碎片拜访 3 次（1 天）。"],
  [700, "无需拜访。"],
]) {
  setGrowth("shards", shards, "input");
  assert.equal(el("growth-outcome").textContent, expected);
}
setGrowth("awakening", 4, "input");
setGrowth("transcend", 3, "input");
assert.equal(el("growth-outcome").textContent, "材料已备齐，无需拜访。");

calculatorTabs[1].listeners.keydown({ key: "ArrowLeft", preventDefault() {} });
assert.equal(el("calculator-pulls").hidden, false);
assert.equal(el("mobile-summary").hidden, false);
assert.equal(el("calculator-growth").hidden, true);
assert.equal(document.activeElement, calculatorTabs[0]);
assert.equal(run("JSON.stringify(calc())"), calcBefore);
calculatorTabs[1].listeners.click();
assert.equal(el("growth-shards").value, "700");
const cultivationKey = "cassell.cultivation.v1";
const savedGrowth = storage.get(cultivationKey);
assert.deepEqual(JSON.parse(savedGrowth), {
  current: 4, target: 6, inventory: { shards: 700, awakeningStones: 4, transcendStones: 3 },
});
click("btn-reset");
assert.equal(storage.get(cultivationKey), savedGrowth);
for (const id of ["current", "target", "shards", "awakening", "transcend"]) el(`growth-${id}`).value = "";
run(read("assets/js/cultivation.js"));
assert.equal(el("growth-route").textContent, "觉4 → 超1");
assert.deepEqual(["shards", "awakening", "transcend"].map(id => el(`growth-${id}`).value), ["700", "4", "3"]);
assert.equal(el("growth-outcome").textContent, "材料已备齐，无需拜访。");
setGrowth("shards", "", "input");
assert.equal(JSON.parse(storage.get(cultivationKey)).inventory.shards, null);
setGrowth("current", 10);
assert.equal(el("growth-target").value, "10");
assert.equal(el("growth-route").textContent, "超5 → 超5");
assert.equal(el("growth-outcome").textContent, "当前已是目标等级。");
assert.match(el("growth-roadmap").innerHTML, /最高等级/);
console.log("通过：计算器切换、跨觉醒与超限的累计缺口、后续等级进度、拜访次数与天数、最高等级、养成输入独立保存与恢复。");
