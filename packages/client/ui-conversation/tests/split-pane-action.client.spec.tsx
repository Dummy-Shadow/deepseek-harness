// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SplitPaneAction } from '../src/client/skeleton/SplitPaneAction.tsx'
import type { SplitPaneActionProps } from '../src/client/skeleton/SplitPaneAction.tsx'
import type { ConversationPaneView } from '../src/client/panes.ts'
import { zh } from '../src/client/locales.ts'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const sid = (id: string) => id as SessionId
const SID = sid('s1')

function mount(panes: ConversationPaneView[] = []) {
  const store = createSnapshotStore<readonly ConversationPaneView[]>(panes)
  const togglePane = vi.fn()
  const t = makeTranslate(zh, commonZh)
  // The action reads only the Session id, the panes hook, the toggle callback,
  // and copy; the remaining derived shares are framework seats.
  const props = {
    sessionId: SID,
    usePanes: bindSnapshotSelector(store),
    togglePane,
    t,
  } as unknown as SplitPaneActionProps
  const view = render(<SplitPaneAction {...props} />)
  const trigger = view.container.querySelector('[data-split-pane]') as HTMLButtonElement
  return { view, store, togglePane, trigger }
}

const pane = (id: SessionId): ConversationPaneView => ({ sessionId: id, reference: { sessionId: id } as never })

describe('SplitPaneAction', () => {
  it('renders the open affordance and toggles this Session when not pinned', () => {
    const b = mount()
    expect(b.trigger.getAttribute('aria-pressed')).toBe('false')
    expect(b.trigger.getAttribute('aria-label')).toBe('分屏显示此会话')
    expect(b.trigger.getAttribute('data-split-pane')).toBe('closed')
    fireEvent.click(b.trigger)
    expect(b.togglePane).toHaveBeenCalledWith(SID)
  })

  it('renders the close affordance once this Session is pinned', () => {
    const b = mount([pane(SID), pane(sid('other'))])
    expect(b.trigger.getAttribute('aria-pressed')).toBe('true')
    expect(b.trigger.getAttribute('data-split-pane')).toBe('open')
    fireEvent.click(b.trigger)
    expect(b.togglePane).toHaveBeenCalledWith(SID)
  })

  it('reflects a pane opened after mount in the English dictionary', () => {
    const b = mount()
    b.store.set([pane(SID)])
    const props = {
      sessionId: SID,
      usePanes: bindSnapshotSelector(b.store),
      togglePane: b.togglePane,
      t: makeTranslate(en, commonEn),
    } as unknown as SplitPaneActionProps
    b.view.rerender(<SplitPaneAction {...props} />)
    expect(b.trigger.getAttribute('aria-pressed')).toBe('true')
    expect(b.trigger.getAttribute('aria-label')).toBe('Close split pane')
  })
})
