# dsh-usage-stats

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

DeepSeek Harness 插件：GitHub 风格用量热力图 + Token / 缓存命中 / 账户余额看板 + 工作区别名管理。

- **热力图**：53 周 GitHub 绿，每完成一个回合点亮；悬停按工作区显示次数明细与当日 Token
- **统计卡片**：总花费 Token（分项）、缓存命中率、账户余额（DeepSeek 官方接口）、总使用次数、连续使用、各工作区 Token 进度条
- **工作区别名**：头部「✎ 工作区别名」管理，持久化保存（`$DSH_HOME/storages` 的 KV 单元 `usage-stats-aliases`）
- 时间范围切换（近 30 天 / 近 90 天 / 全部）、动画、亮暗主题自适应

## 效果截图

![用量统计页面效果截图 1](assets/screenshot-1.png)

![用量统计页面效果截图 2](assets/screenshot-2.png)

## 安装

本插件是标准的 DSH 社区插件包（声明 `dsh.bundle` manifest + web client 半），数据全部来自持久化会话日志，安装后自动回填历史。

### 方式一：官方插件命令（推荐）

```bash
dsh plugin --profile web add dsh-usage-stats
```

安装后刷新页面即可，无需手动改配置、无需重启。

### 方式二：手动注册（本地包）

1. 把本目录放入任意位置，并在 `$DSH_HOME/profiles/node_modules/` 下创建指向本目录的符号链接（Windows 用 junction）：
   ```powershell
   New-Item -ItemType Junction -Path "$env:DSH_HOME\profiles\node_modules\dsh-usage-stats" -Target "<本目录绝对路径>"
   ```
2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 添加一行：
   ```yaml
   - insert:
       - id: usage-stats
         name: dsh-usage-stats
   ```
   用户 patch 层会被热重载：保存后刷新页面即可。

## 架构

- **Host 半**（`lib/index.js`）：扫描持久化会话日志聚合用量（`turn/end` + `assistant/message.usage`），监听 `session/event` 实时折叠；通过 `webServer` 服务注册数据路由：
  - `GET /api/usage-stats` — 统计快照
  - `GET /api/usage-stats/balance?force=1` — 账户余额（复用 `llm-deepseek` 的 API Key 配置）
  - `POST /api/usage-stats/alias` — 设置工作区别名
- **Client 半**（`lib/client.js`）：`window.__ModuleLoader__` 工厂格式的浏览器 bundle，注册设置面板「用量统计」页（`settings.section` 槽位）。

## 数据说明

- 使用次数与 Token 全部来自 DSH 持久化会话日志，插件激活时会自动回填全部历史，插件卸载/重启后数据不丢
- 余额查询走 DeepSeek 官方 `/user/balance` 接口；未配置 API Key 时卡片显示引导文案
- 仅统计能归属到已注册工作区（按会话 cwd 匹配）的会话

## 开发

- 修改 `lib/index.js` / `lib/client.js` 后刷新页面即生效（client bundle 随页面加载）；host 半改动通过重启 DSH 生效
- 插件包无第三方依赖：host 半只使用 Cordis 服务，client 半只使用 react（模块表提供）

## License

MIT
