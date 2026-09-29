# Agent Note: 会话壳中的并排分屏 pane

Status: implemented

[English](2026-09-30-session-split-pane.md) | 中文

## Problem

本 fork 的 Web GUI 带有“分屏”：主会话旁边可并排显示第二个**完整可交互**会话。0.2.0 升级把这套功能的地基整体替换，0.1.3 的实现无法平移。

0.1.3 的分屏依赖 sessions 服务上的 `ISessions.pin(id)`/`closePane(id)` 与 `panes` 可观察量，并在 `ui-renderer` 里用自制 `SessionRegionProvider` 渲染每个被 pin 的会话。0.2.0 把这一切删掉了：sessions 服务改为 `retain(target, { source })`，在引用计数下返回 `SessionReference`，不再提供 `panes` 快照；渲染层的按会话绑定改为框架座位 `SessionProvider`，会话体则成为可复用的 `conversation.content` Factory（`packages/client/ui-conversation/src/client/apply.ts`）。因此旧分屏代码既没有承载状态的宿主，也没有可绑定第二会话子树的作用域适配器。

## Decision

一个 pane 是**独立拥有的 `SessionReference`**，而非第二个 current 选择。`ConversationPanes`（`panes.ts`）为每个打开的 pane 在新的 `conversationPane` source 标签下 retain 一个引用，发布为可观察名册，并且只有在名册不再列出该 pane 之后才 release 其引用。所有权是进程内的 Class 状态，与 `ui-sidebar-right` 的 `SidebarSessionViews` 一致；不持久化、不进 store。

主列照旧渲染当前会话。其余每个打开的 pane 渲染各自的一列：带会话列表标题与关闭按钮的头部、左缘拖宽条，以及框架 `SessionProvider session={reference}` 包住的 `renderFactorySlot('conversation.content', …)`。该 Factory 是全局可渲染的，所以 pane 复用主列**完全相同**的“对话记录 + composer”装配；provider 把其中每个会话作用域座位都绑定到 pane 的会话——这正是第二个 pane 无需新增会话级 slot 即可完整可交互的原因。

pane 是**加性**的。头部动作（`SplitPaneAction`，注册进 `conversation.session.header.actions`）把自己所属会话打开为 pane，已打开时则关闭该 pane；可同时打开多个。等于 current 的 pane 不会被渲染为自己的 pane。每个 pane 的宽度是组件私有状态，按会话持久化（`dsh.conversation.paneWidth.<id>`），并 clamp 到 `[320, 720]`。

## Alternatives considered

**复用右侧边栏作为第二会话。** `ui-sidebar-right` 已经 retain 了独立的第二会话并通过 `SessionProvider` 绑定，看起来是明显的捷径。否决：它的座位渲染的是边栏 tab 面（`rightbar.session`），不是会话记录；把它扩成第二会话会违反客户端分层（feature 包不得引入另一 feature 的值或其 slot owner）。

**用 store 保存 pane 并由其驱动 retain。** 否决：store 承载查看状态（draft、宽度），不承载所有权。`SessionReference` 是对象层状态，其生命周期必须跨无关重渲染存活、且恰好 release 一次；store 快照无法表达“名册移除后的下一步再 release”。边栏的先例把引用放在拥有其生命周期的 Class 里。

**新增 `conversation.pane` 子 slot，用注册组件渲染每个 pane。** 否决：没有必要扩面。Factory 的渲染座位对每个 entry 都可用，且 pane 的 phase/hero 由全局会话列表（`useSessions`）算出，调用点并不需要 pane 作用域的框架 hook。`SessionProvider` 内的那次 `conversation.content` occurrence 本就拿到自己绑定到 pane 的标准套件。

**把回调接到 Factory 的 inject face 上。** 否决：头部动作与会话壳都需要 pane 名册与开/关回调，而二者各自都是注册者。各自在自己的 `hooks` 车厢注入名册，就无需伸手到别的 entry 的 inject face。

## Consequences

会话壳现在渲染“主列 + N 个 pane 列”的水平 flex。主列占弹性余量，每个 pane 拥有自己的宽度。因为 `renderFactorySlot` 实例化同一个 Factory，新增 pane 的代价是多挂一棵会话子树，而非第二套实现；未来任何新的会话 View 都能免费出现在 pane 里。

pane 在切换当前会话时存活：名册与选择无关，仅在选中时把“等于 current 的 pane”过滤出不渲染。关闭最后一个引用会按 `retain` 契约释放该会话的 scope 与实时窗口。插件卸载时释放所有 pane。

## Testing

`tests/panes.spec.ts` 覆盖开/切/关/释放、先撤渲染目标后 release 的顺序、幂等 open、以及释放后拒绝 open。`tests/split-pane-action.client.spec.tsx` 覆盖开/关两种外观与切换。`tests/skeleton.client.spec.tsx` 覆盖 pane 列渲染、排除 current、持久化/损坏/默认宽度、带 clamp 与持久化的指针拖宽、丢失捕获的拖动、以及 hero/active 两种 pane 相位。`pnpm run typecheck:contracts-ready` 与 `packages/client/ui-conversation` 套件通过（558 例）；`pnpm run test:gui` 仅剩既有的 Windows `directory-picker-browse` host 路径失败。

## Related

被移除的 0.1.3 实现保留在 fork 分支 `feature/split-pane`（其上的 `2026-09-10-session-split-pane.md`）中作为参照；本分支不可达。
