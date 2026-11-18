/**
 * UR 角色逐级养成消耗，来源：用户于 2026-11-18 提供的 UR 表。
 * shards 与 equivalentCopies 表示同一需求的两种口径，不相加。
 * acquisition 单独记录首次获得觉0，不计入觉0起的升级消耗。
 * 觉醒石/超限石是升级消耗，与 config.js 中的养成奖励分别记录。
 */
const UR_CULTIVATION_CONFIG = {
  shardsPerCopy: 100,
  shardsPerVisit: 5,
  visitsPerDay: 3,
  acquisition: {
    to: "觉0", shards: 100, equivalentCopies: 1, awakeningStones: 0, transcendStones: 0,
  },
  steps: [
    { from: "觉0", to: "觉1", shards: 200, equivalentCopies: 2, awakeningStones: 2, transcendStones: 0 },
    { from: "觉1", to: "觉2", shards: 200, equivalentCopies: 2, awakeningStones: 2, transcendStones: 0 },
    { from: "觉2", to: "觉3", shards: 300, equivalentCopies: 3, awakeningStones: 3, transcendStones: 0 },
    { from: "觉3", to: "觉4", shards: 300, equivalentCopies: 3, awakeningStones: 3, transcendStones: 0 },
    { from: "觉4", to: "觉5", shards: 400, equivalentCopies: 4, awakeningStones: 4, transcendStones: 0 },
    { from: "觉5", to: "超1", shards: 300, equivalentCopies: 3, awakeningStones: 0, transcendStones: 3 },
    { from: "超1", to: "超2", shards: 300, equivalentCopies: 3, awakeningStones: 0, transcendStones: 3 },
    { from: "超2", to: "超3", shards: 400, equivalentCopies: 4, awakeningStones: 0, transcendStones: 4 },
    { from: "超3", to: "超4", shards: 400, equivalentCopies: 4, awakeningStones: 0, transcendStones: 4 },
    { from: "超4", to: "超5", shards: 500, equivalentCopies: 5, awakeningStones: 0, transcendStones: 5 },
  ],
};
