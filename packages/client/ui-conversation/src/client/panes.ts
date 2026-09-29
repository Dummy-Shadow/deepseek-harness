/**
 * Retained Session targets for the Conversation's side panes.
 *
 * A pane is an independently owned `SessionReference`: opening one retains the
 * Session (minting its scope and live window), and closing one releases that
 * reference after the committed render target is withdrawn. Ownership is
 * process-local Class state, never persisted — the object layer, not a store.
 */
import type { ISessions, SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    conversationPane: unknown
  }
}

/** One open side pane: its Session identity plus the reference the provider binds. */
export interface ConversationPaneView {
  readonly sessionId: SessionId
  readonly reference: SessionReference
}

/** Opens, closes, and retires the Conversation's retained side panes. */
export class ConversationPanes {
  /** Open panes in opening order, observed by the shell renderer as `usePanes`. */
  readonly source = createSnapshotStore<readonly ConversationPaneView[]>([])
  private readonly references = new Map<SessionId, SessionReference>()
  private closed = false

  /**
   * @param sessions - allocator for each pane's independent reference.
   */
  constructor(private readonly sessions: ISessions) {}

  /**
   * Open a pane, or close the one already open.
   * @param sessionId - Session to toggle.
   */
  toggle(sessionId: SessionId): void {
    if (this.references.has(sessionId)) this.close(sessionId)
    else this.open(sessionId)
  }

  /**
   * Retain a Session as a side pane. Idempotent; additive, so several panes coexist.
   * @param sessionId - Session to retain.
   */
  open(sessionId: SessionId): void {
    if (this.closed || this.references.has(sessionId)) return
    this.references.set(sessionId, this.sessions.retain(sessionId, { source: 'conversationPane' }))
    this.publish()
  }

  /**
   * Release one pane's reference. The render target is withdrawn before the
   * reference is released so no committed mount loses its Session underfoot.
   * @param sessionId - Session to release.
   */
  close(sessionId: SessionId): void {
    const reference = this.references.get(sessionId)
    if (reference === undefined) return
    this.references.delete(sessionId)
    this.publish()
    reference.release()
  }

  /** Plugin shutdown withdraws every pane and releases every retained reference. */
  dispose(): void {
    if (this.closed) return
    this.closed = true
    this.source.set([])
    for (const reference of this.references.values()) reference.release()
    this.references.clear()
  }

  private publish(): void {
    this.source.set(
      [...this.references.entries()].map(([sessionId, reference]) => ({ sessionId, reference })),
    )
  }
}
