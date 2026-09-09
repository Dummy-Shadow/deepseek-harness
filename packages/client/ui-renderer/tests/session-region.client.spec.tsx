// @vitest-environment jsdom
/**
 * SessionRegionProvider account: the subtree-rebinding region binds its
 * children to one resolved Session binding (adapter.resolve), never to the
 * scope's current selection; unresolvable ids render nothing; a missing
 * session scope adapter fails loud. Rebinding behavior over slot outlets is
 * exercised through the machinery in scoped-slots.client.spec.tsx once the
 * consumer seat lands; this suite drives the provider directly over a
 * behavioral fake host.
 */
import { describe, expect, it, vi } from 'vitest'
import { StrictMode, type ReactNode } from 'react'
import { act, render } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import type {
  ScopedStandardSourceBinding, SlotRendererHost, SlotScopeAdapter,
  StandardSourceBinding,
} from '@deepseek-ai/dsh-client-ui-renderer/client'
import {
  HostContext, SessionRegionProvider, SlotAssemblyError, useScopeBinding,
} from '../src/client/bindings.tsx'

/** Minimal observable source so subscription counts are exact. */
function source<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    set: (next: T) => {
      value = next
      for (const fn of [...listeners]) fn()
    },
    get active() { return listeners.size },
  }
}

const absentBinding = (): StandardSourceBinding =>
  ({ key: undefined, hooks: {}, keyedHooks: {}, props: {} })

/** Region-only host: scope revision + session scope adapter, inert rest. */
function makeHost() {
  const bindings = new Map<string, ScopedStandardSourceBinding>()
  const current = source<StandardSourceBinding>(absentBinding())
  const scopeRevision = source(0)
  let scopeInstalled = true
  let resolves = 0
  const adapter: SlotScopeAdapter = {
    current,
    resolve: (key) => {
      resolves += 1
      return bindings.get(key)
    },
  }
  const host = {
    subscribe: () => () => {},
    getVersion: () => 0,
    entriesOf: () => [],
    entriesOfSlot: () => [],
    reportEntryError: () => {},
    specOf: () => undefined,
    isLive: () => false,
    storeOf: () => undefined,
    root: source(absentBinding()),
    scopeRevision,
    scope: () => (scopeInstalled ? adapter : undefined),
  } satisfies SlotRendererHost
  return {
    host,
    addSession: (id: string): ScopedStandardSourceBinding => {
      const binding: ScopedStandardSourceBinding = {
        key: id,
        ctx: new Context(),
        hooks: {},
        keyedHooks: {},
        props: {},
      }
      bindings.set(id, binding)
      return binding
    },
    current,
    setCurrent: (binding: ScopedStandardSourceBinding | undefined) => {
      current.set(binding ?? absentBinding())
    },
    bumpScope: () => { scopeRevision.set(scopeRevision.getSnapshot() + 1) },
    setScopeInstalled: (installed: boolean) => { scopeInstalled = installed },
    get resolves() { return resolves },
  }
}

/** Probe child reporting the binding its region subtree is bound to. */
function BindingProbe({ capture }: { capture: (binding: StandardSourceBinding) => void }): ReactNode {
  capture(useScopeBinding())
  return null
}

function renderRegion(
  host: SlotRendererHost,
  sessionId: string,
  capture: (binding: StandardSourceBinding) => void,
) {
  return render(
    <HostContext.Provider value={host}>
      <SessionRegionProvider sessionId={sessionId}>
        <BindingProbe capture={capture} />
      </SessionRegionProvider>
    </HostContext.Provider>,
  )
}

describe('SessionRegionProvider', () => {
  it('rebinds the subtree to the resolved Session, not the scope current', () => {
    const h = makeHost()
    const bindingA = h.addSession('a')
    const bindingB = h.addSession('b')
    h.setCurrent(bindingA)
    const seen: StandardSourceBinding[] = []
    renderRegion(h.host, 'b', (binding) => { seen.push(binding) })
    expect(seen.length).toBe(1)
    expect(seen[0]).toBe(bindingB)
    expect(seen[0]!.key).toBe('b')
  })

  it('keeps the resolved binding across re-renders and scope-roster bumps', () => {
    const h = makeHost()
    const bindingB = h.addSession('b')
    const seen: StandardSourceBinding[] = []
    renderRegion(h.host, 'b', (binding) => { seen.push(binding) })
    const resolvesAfterMount = h.resolves
    // A roster change re-runs resolve but resolves to the same cached binding.
    act(() => { h.bumpScope() })
    expect(seen.at(-1)).toBe(bindingB)
    expect(seen.at(-1)!.key).toBe('b')
    expect(h.resolves).toBeGreaterThan(resolvesAfterMount)
  })

  it('renders nothing for an unresolvable id without disturbing hooks', () => {
    const h = makeHost()
    h.addSession('a')
    let captured = 0
    function CountProbe(): ReactNode {
      captured += 1
      return null
    }
    const view = render(
      <HostContext.Provider value={h.host}>
        <SessionRegionProvider sessionId="missing"><CountProbe /></SessionRegionProvider>
      </HostContext.Provider>,
    )
    expect(view.container.firstChild).toBeNull()
    expect(captured).toBe(0)
    view.rerender(
      <HostContext.Provider value={h.host}>
        <SessionRegionProvider sessionId="also-missing"><CountProbe /></SessionRegionProvider>
      </HostContext.Provider>,
    )
    expect(view.container.firstChild).toBeNull()
    expect(captured).toBe(0)
  })

  it('fails loud without an installed session scope adapter', () => {
    const h = makeHost()
    h.setScopeInstalled(false)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderRegion(h.host, 'a', () => {}))
      .toThrow(SlotAssemblyError)
    spy.mockRestore()
  })

  it('is StrictMode-safe and cleans up its scope-revision subscription', () => {
    const h = makeHost()
    const bindingB = h.addSession('b')
    const seen: StandardSourceBinding[] = []
    const view = render(
      <StrictMode>
        <HostContext.Provider value={h.host}>
          <SessionRegionProvider sessionId="b">
            <BindingProbe capture={(binding) => { seen.push(binding) }} />
          </SessionRegionProvider>
        </HostContext.Provider>
      </StrictMode>,
    )
    expect(h.host.scopeRevision.active).toBe(1)
    expect(seen.every(binding => binding === bindingB && binding.key === 'b')).toBe(true)
    view.unmount()
    expect(h.host.scopeRevision.active).toBe(0)
  })
})
