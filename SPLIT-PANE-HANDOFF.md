# SPLIT-PANE HANDOFF（0.2.0 重实现交接）

> 目的：让一个**不带历史上下文**的新会话，从本文件 + `ROADMAP-LOCAL.md` 就能直接在 0.2.0 架构上重做“会话分屏”。
> 旧实现在分支 `feature/split-pane`（基座 0.1.3-alpha.2），**不可平移**：0.2.0 重写了会话引用模型与客户端渲染层。旧实现只作行为参照。

## 0. 现状快照
- 仓库：`D:\soft\deepseek-harness-penguin\deepseek-harness`；分支 **`upgrade/0.2.0-rc.2`**（基座 `dsh-v0.2.0-rc.2`）。
- 旧参照：分支 `feature/split-pane` 上 `a8ac476`(Layer A) `684d5f0`(Layer B) `7184cee`(Layer B 接线) `f5c6b00`(Layer C 数据) `c073878`/`4668b56`/`c2a1a76`(Layer C UI)，行为目标 = 主会话右侧并排第二个**完整可交互会话**（可发消息/审批/多 pane/拖宽/会话选择器）。
- 当前 0.2.0 分支**尚未**实现分屏；本文件描述如何做。

## 1. 目标（与 0.1.3 一致）
Web GUI 主会话右侧并排显示第二个会话：只读起步 → 交互（第二 composer/审批）→ 多 pane、可拖宽、pane 会话选择器。状态跨 current 切换存活。

## 2. 关键架构差异（必须理解）
| 维度 | 0.1.3（旧） | 0.2.0（新） |
|---|---|---|
| 会话打开 | `ctx.sessions.pin(id)` / `closePane(id)` + `sessions.panes` 可观察量 | **`ctx.sessions.retain(target,{source})` → `SessionReference`**（引用计数）；`retainInfo(id)`；无 `panes` |
| 按 sessionId 绑定子树 | ui-renderer `SessionRegionProvider` + `scoped-slots` ScopeProvider | 框架座位 **`SessionProvider session={reference}`**；`ctx.sessions.retain` + `uiSession.bindingSource(reference)` |
| 主面板 | `ConversationRoot` 内自绘右栏 | `ConversationMainPanel` 只渲染 `conversation.header` + `renderFactorySlot('conversation.content', …)` |
| 会话体 | 复用 `conversation.session` 子树 | **`conversation.content` 是可复用 Factory**（`slots.registerFactory`，`apply.ts:309-352`），已在多处按 occurrence 渲染 |
| 右侧栏 | — | `ui-sidebar-right` 已用 `retain`+`SessionProvider` 渲染**独立第二会话视图**（`rightbar.session`），可作模板 |

## 3. 推荐实现路径（照 `ui-sidebar-right` 范式）
`packages/client/ui-sidebar-right` 是 0.2.0 里“独立保留第二个会话并绑定渲染”的现成模板：
- `session-view.ts:6-10` 声明 `SessionReferenceSourceMap` 标签（如 `sidebarView`）——分屏需新增自己的标签（如 `conversationPane`）。
- `session-view.ts:33` `sessions.retain(sessionId,{source:'sidebarView'})`；`retire/dispose` 里 `reference.release()`。
- `shell/RightbarRoot.tsx:17-27` `<SessionProvider session={view.reference}>{renderSlot('rightbar.session', …)}</SessionProvider>`。

分屏落地建议（全部在 `packages/client/ui-conversation` 内，符合“feature 包不许 import 别的 feature 值”纪律）：
1. **pane 身份所有权**：在 ui-conversation 的 `apply` 闭包内维护 pane 集合（自己 retain/release `SessionReference`，模式照 `session-view.ts`），**不要**放进 store（store 只放 JSON 兼容的 UI 状态；引用属 object layer）。pane 的“哪几个 sessionId、宽度”这类可视状态可放 root 级 `createSplitStore()`（`defineStore`，参照 `stores.ts` 的 `conversationStore` 工厂，绝不放 per-session store，否则切 current 会丢）。
2. **绑定渲染**：在 `ConversationMainPanel.tsx`（或它在 `apply.ts:302-307` 的注册处包一层）里，对每个打开的 pane 渲染
   ```tsx
   <SessionProvider session={paneReference}>
     {renderFactorySlot('conversation.content', { variant: 'main', phase, hero }, { slots: CONTENT_SLOTS })}
   </SessionProvider>
   ```
   `renderFactorySlot` 在每个 entry 都可用（`ui-renderer/scoped-slots.tsx:554`）；`conversation.content` factory 是全局的。注意 `SessionProvider` 座位来自“声明了非 root 子 slot 的 entry”，需确认 `main.conversation` 注册的 props 面（`contract/slots.ts:453` 的 `ConversationSlotProps = PropsRuntime<'main.conversation'>` + children）能取到。
3. **header 按钮**：注册进 `conversation.session.header.actions`（list 槽，声明见 `apply.ts:405`，渲染见 `ConversationSession.tsx:128`）。现有可抄的注册者：`ui-jobs/.../JobListAction.tsx`、`ui-subagent/.../SubagentHeaderLineage.tsx`。按钮语义同旧版：当前会话已 pin → 退出（release），否则 retain 自己（**加性**，可多 pane）。
4. **多 pane + 拖宽 + 选择器**：pane 宽度按 pane session 持久化（参照旧版 `localStorage 'dsh.conversation.paneWidth.<id>'`，clamp 280–720，默认 400）；pane 头部下拉选择器列出除 current 外的开放会话（已在其它 pane 的禁用）。
5. **滚动契约**：pane 滚动容器须带 `data-conversation-scroll` 且 `overflow-y:auto`（`ConversationContent.tsx:197` 已用该属性；确认在 pane 的 `SessionProvider` 子树内同样成立），否则 ChatView 自建内层虚拟滚动会卡死。分隔线用 hairline（`packages/client/ui-theme` 门禁：neutral border 必须 `0.5px solid var(--dsw-alias-border-*)`）。
6. **样式/布局**：主列 + 右栏用 flex/grid；主列最小宽度（旧版踩过坑）。样式走 CSS Modules + 语义别名，不写死颜色。

## 4. 纪律与门禁（硬性）
- **不得 runtime import 其它 feature 包的值**：跨包只能 slots/services/`import type`（`packages/client/AGENTS.md`）。
- **组件不碰 ctx**：数据经五类 derive props（`PropsRuntime/PropsRenderSlots/PropsRenderFactories/PropsStore` + inject face）；反应式事实走 store / inject `hooks` 车厢 / `sessions.provide`，组件内禁 `useSyncExternalStore`。
- **文案 locale-owned**：所有用户可见串进 typed 字典（`t`），`verify-client-ui-i18n` 会拒硬编码。
- **覆盖率**：client 源包 per-file 100%（`pnpm run test:coverage`）；不可达防御分支用 `/* v8 ignore -- <原因> */`。
- **检查阶梯**：`pnpm run test:gui`（秒级）→ 改动影响装配可见输出时 `DSH_SNAPSHOT=replay pnpm run test:web` → 推 PR 前用 `dsh-pre-push-checks`。
- **非平凡改动需 Agent Note**（`.agents/notes/implemented/feature/…`），旧 note 参照 `feature/split-pane` 分支的 `2026-09-10-session-split-pane.md`。

## 5. 验证
- 命令：`pnpm run typecheck`；`pnpm test -- packages/client/ui-conversation packages/client/ui-renderer packages/client/ui-session`；改动装配面后 `pnpm run test:gui`。
- 肉眼：重启 `dsh web`（0.2.0 源码），开两个会话 → 分屏 → 右栏出现第二个会话；切 current 右栏不丢；关闭可回收；多 pane/拖宽/选择器可用。
- Windows 注意：`core.symlinks=false`，勿用 tar 解源码包；bash 里 `/d`、`/c` 非盘符，改仓库用 read/edit/write + workdir 原生路径。

## 6. 关键文件锚点（0.2.0，以分支实际行号为准）
- 会话引用服务：`packages/api/session-controller/src/client/contract/sessions.ts`（`retain/using/retainInfo/SessionReference`）、`…/sessions/service.ts`
- 作用域适配：`packages/client/ui-session/src/client/index.ts`（`installScope('session')`、`bindingSource`）、`…/session-provider.tsx`
- 渲染座位：`packages/client/ui-renderer/src/client/scoped-slots.tsx`（`SessionProvider`=scopeAreaProvider、`renderFactorySlot`）、`…/bindings.tsx`
- 主面板/内容：`packages/client/ui-conversation/src/client/skeleton/{ConversationMainPanel,ConversationContent,ConversationSession}.tsx`、`…/apply.ts`
- 现成模板：`packages/client/ui-sidebar-right/src/client/{session-view,service}.ts`、`…/shell/RightbarRoot.tsx`
- pane 状态范式：`ui-sidebar-right/src/client/stores.ts`（dockkit split-tree）、`ui-layout/src/client/stores.ts`
