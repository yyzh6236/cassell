/**
 * ===== 可维护配置 =====
 * SOURCES: 抽数来源。max = 限购次数（免费途径为 1；null = 不限购）
 * tickets: kind="tickets"，填券数；ticketRatio 张券 = 1 抽；maxPulls 可选上限
 * pulls: kind="pulls"，直接填兑换抽数；defaultValue 默认全换；diamondsPerPull 每抽钻石
 * checkin: kind="checkin"，填已签到天数；totalDays 总天数，pullsPerDay 每日抽数
 * MILESTONES: 开头单独展示的重要奖励（专武）
 * CULTIVATE_REWARDS: 培养星级奖励参考表（不参与抽数合计）
 * SHOP_REWARDS: 累抽商店奖励表（按方案抽数显示达成状态，不参与抽数合计）
 */
const SOURCES = [
  {
    id: "diamond", name: "钻石兑换", cost: 0, group: "free", kind: "pulls",
    defaultValue: 50, maxPulls: 50, diamondsPerPull: 500, unit: "抽",
    hint: "每抽500钻石 · 最多50抽（25000钻石）",
  },
  { id: "awaken2", name: "觉2奖励", cost: 0, pulls: 20, max: 1, group: "free" },
  { id: "awaken3", name: "觉3奖励", cost: 0, pulls: 30, max: 1, group: "free" },
  { id: "super3", name: "超3奖励", cost: 0, pulls: 40, max: 1, group: "free" },
  { id: "story", name: "剧情奖励", cost: 0, pulls: 3, max: 1, group: "free" },
  { id: "checkin0", name: "0元签到", cost: 0, group: "free", kind: "checkin", totalDays: 7, pullsPerDay: 1, defaultValue: 0, unit: "天", hint: "7天签到 · 每天1抽" },
  {
    id: "urStock",
    name: "已囤UR券",
    cost: 0,
    group: "free",
    kind: "tickets",
    ticketRatio: 1, // 1 UR 券 = 1 抽
    unit: "UR券",
    hint: "背包过去囤的 UR 券",
  },
  {
    id: "ssr",
    name: "SSR券兑换",
    cost: 0,
    group: "free",
    kind: "tickets",
    ticketRatio: 2, // 2 SSR 券 = 1 UR 抽
    maxPulls: 200,  // 原表最多可兑抽数 = 上限
    unit: "SSR券",
    hint: null,
  },

  { id: "checkin88", name: "88元签到", cost: 88, pulls: 50, max: 1, group: "paid" },
  { id: "pack30", name: "30元礼包", cost: 30, pulls: 10, max: 1, group: "paid" },
  { id: "pack68", name: "68元礼包", cost: 68, pulls: 16, max: 2, group: "paid" },
  { id: "pack128", name: "128元礼包", cost: 128, pulls: 24, max: 3, group: "paid" },
  { id: "pack198", name: "198元礼包", cost: 198, pulls: 30, max: 4, group: "paid" },
  { id: "pack328", name: "328元礼包", cost: 328, pulls: 42, max: 5, group: "paid" },
  { id: "pack648", name: "648元礼包", cost: 648, pulls: 72, max: null, group: "paid" }, // 不限购
];

// 打开页面时默认勾选（对照截图）
const DEFAULT_ENABLED = [
  "diamond", "awaken2", "awaken3", "super3", "story", "checkin0", "checkin88",
];

const MILESTONES = [
  { pulls: 600, reward: "专武" },
];

// 按星级对齐：觉醒 / 超限并排；未知填 null → 显示「？」
const CULTIVATE_REWARDS = [
  { level: 1, awaken: "觉醒石 ×1", transcend: "超限石 ×3" },
  { level: 2, awaken: "UR券 ×20", transcend: "超限石 ×4" },
  { level: 3, awaken: "UR券 ×30", transcend: "UR券 ×40" },
  { level: 4, awaken: "觉醒石 ×5", transcend: "SSR全基础龙文任选" },
  { level: 5, awaken: "皮肤", transcend: "SSR全光暗龙文任选" },
];

const SHOP_REWARDS = [
  { pulls: 200, reward: "SSR全基础龙文任选 ×1" },
  { pulls: 300, reward: "超限石 ×3" },
  { pulls: 400, reward: "橙色核心任选 ×1" },
  { pulls: 500, reward: "超限石 ×4" },
  { pulls: 600, reward: "专武" },
  { pulls: 650, reward: "超限石 ×5" },
  { pulls: 700, reward: "SSR全基础龙文任选 ×1 + SSR全光暗龙文任选" },
];
