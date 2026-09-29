import { describe, expect, it } from 'vitest'
import type { ISessions, SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ConversationPanes } from '../src/client/panes.ts'

const sid = (id: string) => id as SessionId

interface Release {
  readonly id: SessionId
  /** Snapshot of the open panes at the moment the reference was released. */
  readonly openAtRelease: readonly SessionId[]
}

function fakeSessions() {
  const releases: Release[] = []
  let observe: () => readonly SessionId[] = () => []
  const sessions = {
    retain: (id: SessionId): SessionReference => ({
      sessionId: id,
      release: (): void => { releases.push({ id, openAtRelease: observe() }) },
    } as unknown as SessionReference),
  } as unknown as ISessions
  return {
    sessions,
    releases,
    watch: (getter: () => readonly SessionId[]): void => { observe = getter },
  }
}

function roster(panes: ConversationPanes): readonly SessionId[] {
  return panes.source.getSnapshot().map(view => view.sessionId)
}

describe('ConversationPanes', () => {
  it('opens additive panes and publishes their references in order', () => {
    const { sessions } = fakeSessions()
    const panes = new ConversationPanes(sessions)
    panes.open(sid('a'))
    panes.open(sid('b'))
    expect(roster(panes)).toEqual([sid('a'), sid('b')])
    expect(panes.source.getSnapshot()[0]?.reference.sessionId).toBe(sid('a'))
  })

  it('ignores re-opening the same pane', () => {
    const { sessions } = fakeSessions()
    const panes = new ConversationPanes(sessions)
    panes.open(sid('a'))
    const first = panes.source.getSnapshot()[0]?.reference
    panes.open(sid('a'))
    expect(panes.source.getSnapshot()).toHaveLength(1)
    expect(panes.source.getSnapshot()[0]?.reference).toBe(first)
  })

  it('toggles a pane open then closed', () => {
    const { sessions, releases } = fakeSessions()
    const panes = new ConversationPanes(sessions)
    panes.toggle(sid('a'))
    expect(roster(panes)).toEqual([sid('a')])
    panes.toggle(sid('a'))
    expect(roster(panes)).toEqual([])
    expect(releases.map(entry => entry.id)).toEqual([sid('a')])
  })

  it('withdraws the render target before releasing the reference', () => {
    const { sessions, releases, watch } = fakeSessions()
    const panes = new ConversationPanes(sessions)
    watch(() => roster(panes))
    panes.open(sid('a'))
    panes.close(sid('a'))
    // The release callback observed an already-empty roster: the committed
    // mount never loses its Session underfoot.
    expect(releases[0]?.openAtRelease).toEqual([])
  })

  it('ignores closing a pane that was never open', () => {
    const { sessions, releases } = fakeSessions()
    const panes = new ConversationPanes(sessions)
    panes.close(sid('missing'))
    expect(releases).toHaveLength(0)
  })

  it('disposes every pane once and refuses later opens', () => {
    const { sessions, releases } = fakeSessions()
    const panes = new ConversationPanes(sessions)
    panes.open(sid('a'))
    panes.open(sid('b'))
    panes.dispose()
    expect(roster(panes)).toEqual([])
    expect(releases.map(entry => entry.id)).toEqual([sid('a'), sid('b')])
    panes.dispose()
    expect(releases).toHaveLength(2)
    panes.open(sid('c'))
    expect(roster(panes)).toEqual([])
  })
})
