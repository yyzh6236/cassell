# Cassell · UR 抽数与养成计算器

静态网页工具：按免费途径 / 礼包 / 券兑换勾选方案，实时估算总抽数、花费与累计奖励达成情况。

在「卡池进度」填写已抽抽数，累计进度按「已抽 + 计划」计算。0元签到填写已签到天数，仅计入剩余可领抽数；钻石兑换可填0–50抽，默认全换。已抽次数不计入计划单抽均价的分母。

「UR养成」标签可按当前等级、目标等级和库存计算材料缺口，查看后续各级的进度与拜访次数。等级和库存自动保存在当前浏览器中。详见 [UR 角色养成消耗](docs/ur-cultivation.md)。

## 本地打开

直接用浏览器打开入口文件：

```bash
open index.html
```

或起一个本地静态服务（避免个别浏览器对本地脚本的限制）：

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080/
```

## 目录结构

```text
.
├── index.html              # 入口页面
├── assets/
│   ├── css/
│   │   └── styles.css      # 样式
│   └── js/
│       ├── config.js       # 可维护配置（来源 / 奖励表）
│       ├── app.js          # 抽数计算器逻辑
│       ├── cultivation-config.js  # UR 养成消耗
│       └── cultivation.js        # UR 养成计算器逻辑
├── docs/                   # 说明文档（可继续补充）
└── README.md
```

## 配置维护

编辑 `assets/js/config.js`：

| 配置 | 用途 |
|------|------|
| `SOURCES` | 抽数来源（免费 / 礼包 / 券输入） |
| `DEFAULT_ENABLED` | 打开页面时默认勾选的来源 id |
| `MILESTONES` | 开头单独展示的重要奖励（600 抽专武） |
| `CULTIVATE_REWARDS` | 培养星级奖励参考表（不参与合计） |
| `SHOP_REWARDS` | 累抽商店奖励，与养成奖励通过标签切换，按方案抽数显示达成状态 |

礼包 `max`：

- 数字：限购次数
- `null`：不限购（如 648）

券类来源 `kind: "tickets"`：

- `ticketRatio`：几张券换 1 抽
- `maxPulls`：可选兑换上限

## 技术说明

纯前端静态页，无构建步骤；字体通过 Google Fonts CDN 加载。

奖励与标签切换检查：`node tests/rewards.test.js`（使用 Node.js 内置模块，无需安装依赖）。
