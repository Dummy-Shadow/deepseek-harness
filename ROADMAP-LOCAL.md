# DeepSeek Harness 本地 fork 工作台账（可勾选）

> 基线：**dsh-v0.2.0-rc.2**（2026-09-29 上游 tag `639ed01539`）。
> 运行目录：`D:\soft\deepseek-harness-penguin\deepseek-harness`，分支 **`upgrade/0.2.0-rc.2`**（fresh tree，已在 Dummy-Shadow fork 上）。
> 维护规则：每一项勾掉前必须“有产出/能验证”。改代码类的任务默认先在 `upgrade/0.2.0-rc.2` 分支做。
> 旧分支 `feature/split-pane`（0.1.3-alpha.2）与标签 `pre-upgrade-0.2.0-20260930`、`custom-before-upgrade-20260909` 保留作回退点。

## 一、已完成 ✅
- [x] 从上游 `deepseek-ai/deepseek-harness` fetch 到 `dsh-v0.2.0-rc.2`（本地原为 0.1.3-alpha.2；`git` 走本机代理 `127.0.0.1:12334`）
- [x] 全新树切出 `upgrade/0.2.0-rc.2`（`pnpm install` + `pnpm run clean` + `pnpm run typecheck` 全绿）
- [x] 自定义 agent preset 移植：`concurrency`（并发模式）/ `research`（科研模式）改为 0.2.0 声明式 `@deepseek-ai/dsh-agent-preset` 行，落在 `packages/bundle/web-app/presets/{concurrency,research}.patch.yml`，并在 `web-app/package.json` 的 `files` 与 `dsh.bundle.patch` 注册
- [x] `科研模式-AGENTS.md`（科研模式规范蓝本）迁回仓库根
- [x] `.gitignore`：忽略 `.research/`、`*.log`、`DSH-迭代方案.md`、`二次开发指南.tex/.pdf`、`deepseek.ico`、根启动 `.bat/.lnk`
- [x] **4.1 flash 接入**：官方 API 现为 `id=deepseek-flash`（DeepSeek-V4.1-Flash，text+image、1M ctx）；写入 `~/.dsh/settings.yaml` 目录并把默认模型切到 `deepseek-flash`（`deepseek-v4-flash` / `deepseek-v4-flash-vision-exp` 旧 id 已被 API 别名到同一模型，故仓库默认目录暂不动，避免上游 snapshot 连锁重录）
- [x] 门禁：`verify-runtime-closure`（6 presets 闭环）、`verify-default-product-isolation`、`verify-config-source-ownership` 全绿
- [x] 推送分支到 fork：`mine/upgrade/0.2.0-rc.2`

## 二、进行中 / 待办 🔄
- [ ] **分屏（split pane）重实现**：0.2.0 已把 `ISessions.pin/closePane` + `panes` 可观察量重构为 `retain(target,{source})`/`SessionReference` 引用计数模型，旧的 Layer A/B/C 代码不可平移，须按新架构重写。落点与配方见 `SPLIT-PANE-HANDOFF.md`。这是“保留当前 WebUI 插件功能”里唯一仍需大量工作的项。
- [ ] **外部 WebUI 插件对齐**：升级到 0.2.0 后核对 `@linxin666/dsh-web-all`（SSH/任务看板/宠物/skin-center/git-graph 等）、`@proton1917/dsh-live-stats`、`@a9i5k4/dsh-literature`、`dsh-mimir`、`dsh-kb-rag` 的兼容版本；插件 API 破坏性变更需按上游说明重新对齐（0.1.2-alpha.1 起官方讨论 #4867）
- [ ] 运行验证：重启 `dsh web`（0.2.0 源码）确认 Web UI、会话迁移、4.1 flash 选择、并发/科研 preset 可用
- [ ] 合并/发布决策：是否需要把 `upgrade/0.2.0-rc.2` 合回本地主工作树，或长期驻留分支

## 三、已被上游取代 / 可删除 🗑️
- **`tools/fs-ext-win-stub` + `pnpm-workspace.yaml` 的 `fs-ext` override**：0.2.0 已用预编译 `@deepseek-ai/node-addon-system/flock` 取代 `fs-ext`，Windows 不再需要 C++ 工具链，故整体删除，不再移植。
- **token 悬停明细（ui-chat StatsLine）**：0.2.0 的 `StatsPills` 已提供 `UsagePill` 弹窗，原生展示 未缓存输入 / 缓存读 / 缓存写 / 输出 四项计费桶，功能已具备，无需移植。
- `deepseek-harness-old-011`（0.1.1-rc.2 + `ui-arch-browser` 自研插件）：已 fetch 到 0.2.0 tags；该定制未随 0.1.3 fork 带入，且其插件协议与 0.2.0 差异大。确认无回退需求后可删除。

## 四、参考
- 上游：`https://github.com/deepseek-ai/deepseek-harness`；fork：`https://github.com/Dummy-Shadow/deepseek-harness`
- 分屏移植交接：`SPLIT-PANE-HANDOFF.md`
- 规范蓝本：仓库根 `科研模式-AGENTS.md`
- 网络：`github.com` 直连被重置，走代理 `http://127.0.0.1:12334`；`api.github.com` / `codeload.github.com` 可直连
