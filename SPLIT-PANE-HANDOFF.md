# SPLIT-PANE HANDOFF（Layer B/C 开工交接）

> 目的：让一个**不带历史上下文的**新会话，从这份文档 + `ROADMAP-LOCAL.md` 就能直接续做“会话分屏”。本文档只描述现状与待办，不复述已完成对话。

## 0. 现状快照（先读这个）
- 仓库：`D:\soft\deepseek-harness-penguin\deepseek-harness`（DeepSeek Harness fork，基座 **dsh-v0.1.3-alpha.2**）。
- 分支：**`feature/split-pane`**；关键提交：
  - `a04df32` WIP 检查点（0.1.3 适配：concurrency/research preset、token 悬停细分、fs-ext stub、科研技能蓝本等，全部已验证）；
  - `a8ac476` **Layer A**：`ISessions.pin/closePane` 已实现并通过 `pnpm run typecheck:contracts-ready`；
  - `684d5f0` **Layer B provider**：`SessionRegionProvider`（ui-renderer bindings 内部组件 + 单测）；
  - `7184cee` **Layer B wiring**：renderer service 面 `UiRendererService.sessionRegion` 暴露该组件；
  - `f5c6b00` **Layer C data**：`ISessions.panes` 只读 observable；
  - `c073878` / `4668b56` **Layer C UI**：ConversationRoot 右栏只读 pane（region 复用 `conversation.session` 子树）+ header 分屏按钮 + hairline 修正与 GUI bench 桩。
- 运行基座不受影响（当前 Web 未运行；重启用 `启动-DeepSeek-Harness.bat`，仓库根即有）。
- 注意：`pnpm run test:gui` 本地仍有一个与本改动无关的预置 Windows 失败 `packages/host/directory-picker-browse`（路径正斜杠断言）。

## 1. 目标
在 Web GUI 实现“会话分屏”：主会话右侧并排显示**第二个完整会话**。既定顺序先做**只读 pane（后台/只读跟随）**，交互（第二 composer/审批）留后续。

## 2. Layer A（已完成，勿重做）
改动文件（本次任务不要回退它们）：
- `packages/api/session-controller/src/client/contract/sessions.ts`：接口加 `pin(id)`/`closePane(id)`。
- `packages/api/session-controller/src/client/sessions/service.ts`：`panes` Set；`pin` 打开会话但不改 current；`pruneScopes`/`sweepDeferred` 对 pane 与会话同样“保留”；`closePane` 回收；文件头注释已注明 multi-pane。
- `packages/test-support/client-runtime/src/sessions.ts`（TestSessions 补 pin/closePane 桩）、`packages/client/ui-conversation/tests/conversation-registry.client.spec.ts`（fake 补桩）。

## 3. Layer B：渲染机“按 sessionId 绑定子树”的区域
### 3.1 关键代码事实（已读源码确认，file:line 以当前分支为准）
- `packages/client/ui-slots/src/renderer.ts`
  - `SlotScopeAdapter`（~:90-98）：`readonly current: HostObservable<StandardSourceBinding>`，`resolve(key: string): ScopedStandardSourceBinding | undefined`（`ScopedStandardSourceBinding` 含 `key` + `ctx`，~:84）。
  - `StandardSourceBinding`（~:72）：`key?: string` + 固定名 sources。
- `packages/client/ui-renderer/src/client/bindings.tsx`（143 行，先整读）
  - `ScopeBindingContext`（:30）；`ScopeProvider`（:130-143）用 `host.scope('session')` 拿 adapter，`observableHook(adapter.current)` 得到 binding 后 push context。这就是“树只有一份 scope”的根。
  - `RootStandardProvider`/`useScopeBinding`/`maybeObservableHook`/`observableHook` 供复用。
- `packages/client/ui-session/src/client/index.ts`：`UiSession` 提供 `SlotScopeAdapter`；`bindings`/`resolve(key as SessionId)`（:254 一带）可为任意已列 session 出 per-session 贡献；`sessions.binding(id)`（service Layer A）在 `pin()` 后必非空。
- `packages/client/ui-renderer/src/client/scoped-slots.tsx`：`SessionProvider`/`scopeAreaProvider`（:396-411/:467-473）、`ScopeProvider` 根安装点（~:945）、标准座位注册。

### 3.2 待实现（新会话第一件事）
1. 在 `bindings.tsx` 加导出组件（放在 `ScopeProvider` 旁边）：
   ```tsx
   export function SessionRegionProvider({ sessionId, children }: { sessionId: string; children: ReactNode }) {
     const host = useHost()
     observableHook(host.scopeRevision)((v) => v)   // 与 ScopeProvider 同款：保证 revision 订阅顺序稳定
     const adapter = host.scope('session')
     if (adapter === undefined) throw new SlotAssemblyError("...")
     const binding = adapter.resolve(sessionId)     // ScopedStandardSourceBinding | undefined
     if (binding === undefined) return <AbsentRegion>{children}</AbsentRegion>  // 未知/未就绪：给“无会话”等价绑定或占位，保持 hooks 顺序稳定
     return <ScopeBindingContext.Provider value={binding}>{children}</ScopeBindingContext.Provider>
   }
   ```
   - “未知 id”分支务必**恒定返回同一占位（不改变 hooks 顺序）**：参考 `maybeObservableHook`/`absentSource`；不要直接抛错。
2. **单测**（jsdom；仿现有 ui-renderer/ui-session 组件 spec）：
   - 已知 session 的 region 内，`useScopeBinding()` 拿到该 id 的 binding（key 正确）；
   - 未知 id 不崩、hooks 顺序稳定；
   - current 切换不影响已渲染 region 的绑定（验证绑定来自 resolve 而非 current）。
3. **消费入口决策（先读再定，别拍脑袋）**：feature 包不许 import `ui-renderer` 的值（`packages/client/AGENTS.md`）。候选 (i)/(ii)/(iii) 详见下——**已实现并追记于 §8：最终走 cordis service 桥接，(i)/(ii)/(iii) 均未采用**。

## 4. Layer C：右栏只读 pane + 按钮（草案；落地以 §0 提交 + §8 为准，createSplitStore 与候选 A/B 的表述已被实现取代）
- `packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx`（主 body 渲染区 ~:163-205/:372-394）：在 body 旁按 pane 状态渲染右栏容器（CSS：双列 flex/grid，窄屏降级隐藏），右栏内用 Layer B 的 region 包住只读会话视图。
- `packages/client/ui-conversation/src/client/stores.ts`：加 **root 级** `createSplitStore()`（defineStore 模式，`createXXXStore()` 工厂；**不要**放 per-session `conversationStore`——pane 状态要跨 current 切换存活）。状态：`{ paneSessionId?: string }` + actions：`openPane(id)`（调 `ctx.sessions.pin(id)`）、`closePane()`（`closePane(id)`）。
- 按钮：注册进 `conversation.session.header.actions`（list 槽，声明 `packages/client/ui-conversation/src/client/contract/slots.ts:131-135/207-210`；范式照抄 `ui-jobs/src/client/index.ts:30-41`）。按钮只负责“把当前会话加入 pane”，写方在 apply 闭包经注入服务调 store/`sessions`。
- “只读 pane 里渲染什么”**先读再定**：候选 A=在 region 里 `renderSlot('conversation.view', { only: 'chat' })`（复用 ChatView，跳过 composer）；候选 B=只读区域自绘精简列表。倾向 A；需要确认 `conversation.view` 在 owner 子树内能否二次渲染（owner 声明/渲染权规则：`packages/client/AGENTS.md` slot 纪律）。

## 5. 收尾/验证（每层都要）
- 命令：`pnpm run typecheck:contracts-ready`；`pnpm vitest run packages/client/ui-renderer packages/client/ui-session packages/client/ui-conversation`（target）；改动影响装配可见输出再加 `pnpm run test:gui`。
- 覆盖门禁：client 源包 per-file 100%（`pnpm run test:coverage` 相关包）——写清 `/* v8 ignore -- <原因> */`。
- 提交到 `feature/split-pane`，pre-commit 钩子会跑 lint/第三方声明/whitespace；Agent Note 在合并进主干时补（`.agents/notes/implemented/…`）。
- 合并/回主干策略：全部在 `feature/split-pane` 上小步提交；跑通 + 你肉眼验收后再合回主工作树。
- 肉眼验收：重启 `启动-DeepSeek-Harness.bat`，开两个会话 → 点分屏 → 右栏出现第二个会话（先只读）；切 current 时右栏不丢；关闭按钮可回收。

## 6. 注意事项/坑
- Windows 无法建符号链接：git 已 `core.symlinks=false`；不要用 tar 解源码包（CLAUDE.md 符号链接会失败）。
- 本机 bash 的 `/d`、`/c` 不是盘符（写文件/运行命令用原生 `D:\...` 或 `/cygdrive` 语义不可靠）——只读命令可用；改仓库用 read/edit/write 工具 + workdir 原生路径。
- github.com 直连被重置：下载走 `codeload.github.com`；git 需代理时用 `-c http.proxy=http://127.0.0.1:12334`（该代理当前可能不可用，直连 api/codeload 即可）。
- hook 顺序/ExactOptionalPropertyTypes：region 占位分支要稳定，勿显式传 `undefined` 给 optional prop。
- 不要 import 其它 feature 包组件；跨包只能 slots/services/`import type`。
- ui-theme 扫描门禁：neutral border 必须 hairline（`0.5px solid var(--dsw-alias-border-*)`），分隔线用 0.5px 高的 background hairline；新加这类规则要跑 `packages/client/ui-theme/tests/elevation-styles.client.spec.ts`。

## 7. 参考链接（仓库相对路径）
- 台账：`ROADMAP-LOCAL.md`
- 升级方案：`DSH-迭代方案.md`
- 开发/纪律：根 `AGENTS.md`、`packages/client/AGENTS.md`、`docs/subsystems/web-client.md`、`docs/subsystems/slots.md`
- 代码锚点见 §3.1（以当前分支实际行号为准，先行 `git log --oneline -1` 确认在 `feature/split-pane`）。

## 8. Layer B/C 决策记录（实现后追记，勿重走弯路）
- 消费入口：**不做** ui-slots `SlotMap/PropsRenderSlots` 公开 seat 扩面（会被判为改 DSH 本体、波及全部 owner）；**不做** ui-session inject 面下发（inject 禁 ReactNode producer + ui-session 不能 value 依赖 ui-renderer）。选定 **cordis service 桥接**：ui-renderer 在自有 service 面加 `sessionRegion`（插件内加性），ui-conversation `inject` 加 `'uiRenderer'`，`apply` 闭包取之并在注册时用 `conversationRootWithRegion`（`skeleton/ConversationRootWithRegion.tsx`）包装为普通 prop 传入（值跨包走 service，属合规通道）。凡 mount ui-conversation `apply` 的 GUI bench 都要先 `ctx.provide('uiRenderer', { mount, sessionRegion })`。
- pane 状态 = **sessions service 的 `panes`**（Layer A 保留集），新增只读 observable `ISessions.panes`（`f5c6b00`，实现含 TestSessions 镜像与 `sessions-service.client.spec.ts` 用例）；UI 不建 root split store。根 hook **不**做进 `GlobalStandardProps`（会造成全 client owner 类型涟漪），改为 ConversationRoot / 分屏按钮各自的 register `inject.hooks.sessionPanes`（ConversationInjected 包内私有）。
- pane 内容 = **region 复用 `conversation.session` 子树 + 完整 composer 链**：每个 pane 在 pinned `SessionRegion` 内渲染 transcript（`conversation.session`）与 composer（`conversation.composer` 链，owner 传 `sessionId=paneId`、`session: undefined`、`pendingInteraction` 取自根 pending 快照 `map.get(paneId)`——链 select 只读 pendingInteraction，组件从 region 上下文取 pinned kit）。因此右栏是**完整可交互第二会话**：可发消息/停止/附件，审批/提问等接管面板也出现在右栏。pane 显示条件：`panes` 中 ≠ current、且 `phase==='active'`（hero/settling 隐藏但 pin 保留）。
- **多 pane + 加性 pin**：分屏按钮（`SplitPaneAction`，id `split-pane`，order 30）**始终显示**、**加性**——header 会话已 pin=退出（`closePane`），否则 `pin` 自己（不再“替换”）；可同时保留多个 pane，逐列 × 关闭。pane 头部是**会话下拉选择器**（列出除 current 外的开放会话，已在其它 pane 的禁用），可直接把该列换到别的会话（`closePane(old)`+`pin(new)`）。
- **pane 宽度可拖拽**：每列左缘 `PaneResizeHandle`，拖宽公式 `base + (origin.x − clientX)`（往左拉宽），clamp 280–720（默认 400），宽度按 pane 会话持久化到 `localStorage 'dsh.conversation.paneWidth.<id>'`；主列宽度轴扣除 `visiblePanes.reduce(widthOf)`。
- **右栏滚动契约**：`.paneBody` 必须带 `data-conversation-scroll` 且 `overflow-y:auto`（ChatView 在有该祖先时才外包滚动、按自然高度排版；否则它自建内层 virtual scroller，又被 `.root[data-phase=active] .viewArea{flex:1 0 auto}` 撑成内容高度 → 只显示开头、无法滚动/像卡死）。pane 内的内容/composer 宽度轴在 `.pane` 上重锚（`--dsh-chat-content-width: calc(100% - 64px)`）。border/分隔线全部 hairline。
- 未决/收尾：功能全部实现并经肉眼验收（只读→交互 composer/审批、多 pane、可拖宽、会话选择器均已验收）；test:gui 仅余与本改无关的 Windows host 路径失败；合并/推送前跑全量 `test:coverage`。后续可选：多个 pane 横向滚动/主栏最小宽度的体验打磨。
