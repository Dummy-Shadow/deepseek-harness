# Agent Note: Side-by-side Session panes in the Conversation shell

Status: implemented

English | [中文](2026-09-30-session-split-pane.zh.md)

## Problem

The fork carried a Web GUI split pane: the main Conversation could show a second, fully interactive Session beside it. The 0.2.0 upgrade replaced that feature's foundation wholesale, so the 0.1.3 implementation could not be carried over.

The 0.1.3 pane rode `ISessions.pin(id)`/`closePane(id)` and a `panes` observable on the sessions service, and rendered each pinned Session through an ad-hoc `SessionRegionProvider` in `ui-renderer`. 0.2.0 deleted all of it: the sessions service now exposes `retain(target, { source })`, which returns a `SessionReference` under reference counting and ships no `panes` snapshot. The renderer's per-Session binding moved to the framework `SessionProvider` seat, and the Conversation body became the reusable `conversation.content` Factory (`packages/client/ui-conversation/src/client/apply.ts`). The old pane code therefore has no host for its state and no scope adapter to bind a second Session's subtree.

## Decision

A pane is an independently owned `SessionReference`, not a second current selection. `ConversationPanes` (`panes.ts`) retains one reference per open pane under the new `conversationPane` source label, publishes them as an observable roster, and releases a reference only after the roster no longer lists it. Ownership is process-local Class state, matching `ui-sidebar-right`'s `SidebarSessionViews`; it is never persisted and never enters a store.

The main column renders the current Session as before. Every other open pane renders its own column: a header with the Session's list title and a close button, a left-edge resize strip, and the framework `SessionProvider session={reference}` wrapping `renderFactorySlot('conversation.content', …)`. The Factory is globally renderable, so the pane reuses the exact transcript-plus-composer assembly the main column uses; the provider binds every Session-scoped seat inside to the pane's Session, which is what makes the second pane fully interactive without new Session-scoped slots.

Panes are additive. The header action (`SplitPaneAction`, registered into `conversation.session.header.actions`) opens the Session it belongs to as a pane, or closes that pane when already open; several panes can be open at once. A pane equal to the current Session is never rendered as its own pane. Each pane's width is component-private state persisted per Session (`dsh.conversation.paneWidth.<id>`), clamped to `[320, 720]`.

## Alternatives considered

**Reuse the right Sidebar as the second Session.** The `ui-sidebar-right` package already retains an independent second Session and binds it through `SessionProvider`, so it was the obvious shortcut. Rejected: its seat renders the Sidebar's tab surface (`rightbar.session`), not a Conversation transcript, and widening it to a second conversation would couple the two packages against the client layering rules (a feature package imports neither another feature's values nor its slots' owners).

**Keep a pane store and drive retention from it.** Rejected: a store holds viewing state (draft, width), not ownership. A `SessionReference` is object-layer state whose lifetime must survive unrelated re-renders and be released exactly once; a store snapshot cannot express "release on the step after the roster drops it". The sidebar's precedent keeps references in a Class that owns their lifetime.

**Add a `conversation.pane` child slot and render each pane through a registered component.** Rejected as unnecessary surface: the Factory's render seat is available to every entry, and the pane computes its phase/hero from the global Session list (`useSessions`) rather than needing pane-scoped framework hooks at the call site. The `conversation.content` occurrence inside `SessionProvider` already receives its own pane-bound standard kit.

**Wire the callbacks through the factory inject face.** Rejected: the header action and the shell need the pane roster and the open/close callbacks, and both are registrants in their own right. Each registration injects the roster through its own `hooks` compartment, so neither reaches across another entry's inject face.

## Consequences

The Conversation shell now renders a horizontal flex of the main column plus N pane columns. The main column keeps the flexible remainder; each pane owns its width. Because `renderFactorySlot` instantiates the same Factory, adding a pane costs one more mounted Conversation subtree, not a second implementation, and any future Conversation view appears in panes for free.

Panes survive switching the current Session: the roster is independent of selection and the current-Session pane is merely filtered from rendering while selected. Closing the last reference releases the Session's scope and live window exactly as `retain`'s contract states. Plugin shutdown disposes every pane.

## Testing

`tests/panes.spec.ts` covers open/toggle/close/dispose, the release-after-withdraw order, idempotent open, and the post-dispose refusal. `tests/split-pane-action.client.spec.tsx` covers the closed and open affordances and the toggle. `tests/skeleton.client.spec.tsx` covers the pane column rendering, the current-Session exclusion, persisted/corrupt/default widths, the pointer drag with clamping and persistence, a lost-capture move, and hero/active pane phases. `pnpm run typecheck:contracts-ready` and the `packages/client/ui-conversation` suite pass (558 cases); `pnpm run test:gui` passes except the pre-existing Windows `directory-picker-browse` host-path failures.

## Related

The removed 0.1.3 implementation stays on the fork branch `feature/split-pane` (`2026-09-10-session-split-pane.md` there) for reference; it is not reachable from this branch.
