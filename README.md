# Cassell · UR 氪金抽数计算器

静态网页工具：按免费途径 / 礼包 / 券兑换勾选方案，实时估算总抽数、花费与累计奖励达成情况。

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
│       └── app.js          # 计算器逻辑
├── docs/                   # 说明文档（可继续补充）
└── README.md
```

## 配置维护

编辑 `assets/js/config.js`：

| 配置 | 用途 |
|------|------|
| `SOURCES` | 抽数来源（免费 / 礼包 / 券输入） |
| `DEFAULT_ENABLED` | 打开页面时默认勾选的来源 id |
| `MILESTONES` | 累计抽数奖励（如 600 抽专武） |
| `CULTIVATE_REWARDS` | 培养星级奖励参考表（不参与合计） |

礼包 `max`：

- 数字：限购次数
- `null`：不限购（如 648）

券类来源 `kind: "tickets"`：

- `ticketRatio`：几张券换 1 抽
- `maxPulls`：可选兑换上限

## 技术说明

纯前端静态页，无构建步骤；字体通过 Google Fonts CDN 加载。
