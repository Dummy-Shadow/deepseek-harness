# Agent Note: Web session split pane

Status: implemented

## Problem

The Web client showed one session at a time: the center column rendered only the current Session's transcript, and selecting another session in the sidebar replaced it. There was no way to keep one session in view while reading or following a second one — comparing two sessions meant switching back and forth, losing your place each time.

The Session Controller already retained out-of-band sessions through `pin`/`closePane` (a retained scope that survives list removal), so the retention machinery existed; only the render path to show a pinned Session next to the current one was missing.

## Decision

Retained side-pane Sessions render as **fully interactive right-hand columns** beside the main conversation: each pane shows the pinned Session's real transcript plus its own composer, so sending, stopping, and approval/question takeovers work inside the pane. Pinning is additive (several panes at once), each pane width is user-draggable, and each pane can be retargeted to any other open Session from its header.

Three narrow, additive surfaces make this work; none widens the shared slot framework.

1. **Renderer region capability.** [`bindings.tsx`](../../../../packages/client/ui-renderer/src/client/bindings.tsx) gained `SessionRegionProvider`, which rebinds its subtree to `host.scope('session').resolve(sessionId)` (the pinned binding) instead of the scope's current selection; an unresolvable id renders nothing rather than leaking the current Session in. It is internal to `ui-renderer` and delivered to feature plugins through the renderer's own service face [`UiRendererService.sessionRegion`](../../../../packages/client/ui-renderer/src/client/index.ts) — a Cordis service value, not a value import and not a new slot/`PropsRenderSlots` seat. ui-conversation injects `'uiRenderer'` and threads the component as an ordinary prop through [`ConversationRootWithRegion`](../../../../packages/client/ui-conversation/src/client/skeleton/ConversationRootWithRegion.tsx).

2. **Observable pane roster.** [`ISessions.panes`](../../../../packages/api/session-controller/src/client/contract/sessions.ts) is a read-only observable snapshot of retained side-pane ids, published by `pin`/`closePane` in [`service.ts`](../../../../packages/api/session-controller/src/client/sessions/service.ts). The roster is deliberately *not* a root `GlobalStandardProps` hook (that would ripple through every client owner); it rides each consumer's own register `inject.hooks.sessionPanes` inside ui-conversation.

3. **Pane presentation in ui-conversation.** [`ConversationRoot`](../../../../packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx) renders a `.columns` flex row: the existing main column plus one column per retained pane. Each pane wraps its content in a `SessionRegion` for the pinned id, so every occupant derives its kit from that Session: the transcript is the registered `conversation.session` view, and the pane composer is the same `conversation.composer` chain the main column uses (owner `sessionId: paneId`, `session: undefined`, pending taken from the root pending snapshot — chain selectors only read `pendingInteraction`, while the elected component reads the pinned binding). Pane scroll containers carry `data-conversation-scroll` and `overflow-y: auto` so Chat hands scrolling to the pane box (its own inner virtual scroller cannot be bounded in a split column). Pane headers are a Session picker (retarget = `closePane(old)` + `pin(new)`); each pane has a left-edge col-resize handle (drag left widens, clamped 280–720px, persisted per Session id). [`SplitPaneAction`](../../../../packages/client/ui-conversation/src/client/skeleton/SplitPaneAction.tsx) contributes to `conversation.session.header.actions` (`id: 'split-pane'`): always visible and additive — an already-pinned current closes just itself, otherwise it pins the current Session alongside any existing panes.

## Behavior

- Every retained pane (except one equal to the current Session) renders as a fully interactive column: registered transcript view plus its own composer chain, so send/stop and approval/question takeovers live in the pane. Pane headers offer a Session picker to retarget a pane.
- Pinning is additive (`SplitPaneAction` toggles each Session individually), so several panes can be open at once; each can be closed independently.
- Pane widths are draggable (left edge, drag-left widens; 280–720px) and persisted per Session id in `localStorage`; the main-column width axis subtracts the total pane width so the shared chat clamp still targets the main column.
- `pane == current` → that pane is hidden but the pin survives; switching the current Session reveals it again. Panes stay hidden on the hero or while a session settles.
- Retained panes keep their frozen view across list removal until `closePane` (Layer A retention semantics).

## Testing and coverage

- `SessionRegionProvider` unit tests (`packages/client/ui-renderer/tests/session-region.client.spec.tsx`): resolve-not-current, roster-bump stability, unresolvable id renders nothing, missing adapter fails loud, StrictMode-safe.
- Side-pane roster cases in `packages/api/session-controller/tests/sessions-service.client.spec.ts` plus `TestSessions` mirror (`packages/test-support/client-runtime/src/sessions.ts`).
- Split column/hide-when-current/close coverage, multi-pane, pane drag direction/persistence, and picker retarget coverage in `packages/client/ui-conversation/tests/skeleton.client.spec.tsx`; `SplitPaneAction` additive toggle coverage in `packages/client/ui-conversation/tests/split-pane-action.client.spec.tsx`.
- Client `typecheck:contracts-ready` clean; `pnpm run test:gui` green apart from a pre-existing Windows host path expectation (`packages/host/directory-picker-browse`). Full per-file coverage gate is CI-owned and was last exercised on the whole suite.

## Deferred

- Cosmetic follow-ups only: main-column minimum width when many panes are open (the `.columns` band already scrolls horizontally) and tighter in-pane width tuning.
