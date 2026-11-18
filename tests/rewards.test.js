const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const html = read("index.html");
const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
  innerHTML: "", textContent: "", listeners: {}, attributes: {},
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
const tabs = [...html.matchAll(/<button[^>]+role="tab"[^>]*>/g)].map(([tag]) => {
  const el = document.getElementById(tag.match(/id="([^"]+)"/)[1]);
  for (const [, name, value] of tag.matchAll(/([\w-]+)="([^"]*)"/g)) el.setAttribute(name, value);
  el.tabIndex = Number(el.getAttribute("tabindex") || 0);
  document.getElementById(el.getAttribute("aria-controls")).hidden = el.getAttribute("aria-selected") !== "true";
  return el;
});
const context = vm.createContext({ document, localStorage: { getItem() { return null; }, setItem() {} } });
vm.runInContext(read("assets/js/config.js") + "\n" + read("assets/js/app.js"), context);
const run = (code) => vm.runInContext(code, context);
const shop = document.getElementById("shop-rewards");
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
  assert.equal(document.getElementById("milestones").innerHTML.includes('class="milestone hit"'), pulls >= 600);
  checkTab(1);
}
assert.equal(document.getElementById("gap-note").textContent, "当前方案已达成专武奖励。");
console.log("通过：七档奖励、标签点击/键盘切换、各档临界抽数、专武独立展示及计算联动。");
