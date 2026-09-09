# Agent Note: Web session split pane

Status: implemented

## Problem

The Web client showed one session at a time: the center column rendered only the current Session's transcript, and selecting another session in the sidebar replaced it. There was no way to keep one session in view while reading or following a second one — comparing two sessions meant switching back and forth, losing your place each time.

The Session Controller already retained out-of-band sessions through `pin`/`closePane` (a retained scope that survives list removal), so the retention machinery existed; only the render path to show a pinned Session next to the current one was missing.

## Decision

Show one retained side-pane Session in a fixed right column beside the main conversation. The pane is read-only (its own composer and approval flow are deferred). A header action on the current Session pins it as the single pane; pinning again replaces, and closing releases the pin.

Three narrow, additive surfaces make this work; none widens the shared slot framework.

1. **Renderer region capability.** [`bindings.tsx`](../../../../packages/client/ui-renderer/src/client/bindings.tsx) gained `SessionRegionProvider`, which rebinds its subtree to `host.scope('session').resolve(sessionId)` (the pinned binding) instead of the scope's current selection; an unresolvable id renders nothing rather than leaking the current Session in. It is internal to `ui-renderer` and delivered to feature plugins through the renderer's own service face [`UiRendererService.sessionRegion`](../../../../packages/client/ui-renderer/src/client/index.ts) — a Cordis service value, not a value import and not a new slot/`PropsRenderSlots` seat. ui-conversation injects `'uiRenderer'` and threads the component as an ordinary prop through [`ConversationRootWithRegion`](../../../../packages/client/ui-conversation/src/client/skeleton/ConversationRootWithRegion.tsx).

2. **Observable pane roster.** [`ISessions.panes`](../../../../packages/api/session-controller/src/client/contract/sessions.ts) is a read-only observable snapshot of retained side-pane ids, published by `pin`/`closePane` in [`service.ts`](../../../../packages/api/session-controller/src/client/sessions/service.ts). The roster is deliberately *not* a root `GlobalStandardProps` hook (that would ripple through every client owner); it rides each consumer's own register `inject.hooks.sessionPanes` inside ui-conversation.

3. **Pane presentation in ui-conversation.** [`ConversationRoot`](../../../../packages/client/ui-conversation/src/client/skeleton/ConversationRoot.tsx) renders a `.columns` flex row: the existing main column plus a fixed 400px pane when `panes` contains a Session different from the current one (hidden while the pinned Session is current, on the hero, or while settling). The pane reuses the `conversation.session` subtree inside a `SessionRegion`, so the second Session's transcript is the real registered view (read-only: no composer/header are mounted in the pane). The pane scroll container carries `data-conversation-scroll` and `overflow-y: auto` so Chat hands its scrolling to the pane box (its own inner virtual scroller cannot be bounded in a split column). [`SplitPaneAction`](../../../../packages/client/ui-conversation/src/client/skeleton/SplitPaneAction.tsx) contributes to `conversation.session.header.actions` (`id: 'split-pane'`): always visible, single-pin semantics — already-pinned current closes, otherwise it replaces any other pin then pins the current Session.

## Behavior

- Main width axis subtracts the fixed pane width while the pane is open, so the shared chat-width clamp still targets the main column.
- `pane == current` → pane hidden but the pin survives; switching the current Session reveals it again.
- Repeated split/close rounds work (the header action stays visible and acts as a toggle/replace).
- Retained panes keep their frozen view across list removal until `closePane` (Layer A retention semantics).

## Testing and coverage

- `SessionRegionProvider` unit tests (`packages/client/ui-renderer/tests/session-region.client.spec.tsx`): resolve-not-current, roster-bump stability, unresolvable id renders nothing, missing adapter fails loud, StrictMode-safe.
- Side-pane roster cases in `packages/api/session-controller/tests/sessions-service.client.spec.ts` plus `TestSessions` mirror (`packages/test-support/client-runtime/src/sessions.ts`).
- Split column/hide-when-current/close coverage in `packages/client/ui-conversation/tests/skeleton.client.spec.tsx`; `SplitPaneAction` toggle/replace coverage in `packages/client/ui-conversation/tests/split-pane-action.client.spec.tsx`.
- Client `typecheck:contracts-ready` clean; `pnpm run test:gui` green apart from a pre-existing Windows host path expectation (`packages/host/directory-picker-browse`). Full per-file coverage gate is CI-owned and was last exercised on the whole suite.

## Deferred

- A second composer / approval flow inside the pane (the pane stays read-only).
- Multiple simultaneous panes (currently exactly one), resizing the pane, and a session picker for choosing which session the pane shows.
