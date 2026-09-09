// @vitest-environment jsdom
/** SplitPaneAction behavior: single-pane toggle with replace-on-pin semantics. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { SplitPaneAction, type SplitPaneActionProps } from '../src/client/skeleton/SplitPaneAction.tsx'
import { NS } from '../src/client/locales.ts'

afterEach(() => { cleanup() })

const sid = (id: string) => id as SessionId

/** Minimal props: the component reads the current id, the pane roster, `t`, and the actions. */
function actionProps(
  sessionId: SessionId,
  panes: readonly SessionId[],
  overrides: { pin?: () => void; closePane?: (id: SessionId) => void } = {},
): SplitPaneActionProps {
  const useSessionPanes = (() => panes) as unknown as SplitPaneActionProps['useSessionPanes']
  const t: TranslateNS<typeof NS> = key => key as string
  return {
    sessionId,
    useSessionPanes,
    t,
    pin: overrides.pin ?? vi.fn(),
    closePane: overrides.closePane ?? vi.fn(),
  } as unknown as SplitPaneActionProps
}

describe('SplitPaneAction', () => {
  it('pins the header Session while no pane is retained', () => {
    const pin = vi.fn()
    const view = render(<SplitPaneAction {...actionProps(sid('s1'), [], { pin })} />)
    fireEvent.click(view.getByRole('button'))
    expect(pin).toHaveBeenCalledOnce()
  })

  it('closes the pane when the header Session is already the pane', () => {
    const closePane = vi.fn()
    const view = render(
      <SplitPaneAction {...actionProps(sid('s1'), [sid('s1')], { closePane })} />,
    )
    fireEvent.click(view.getByRole('button'))
    expect(closePane).toHaveBeenCalledWith(sid('s1'))
  })

  it('pins the header Session alongside panes already retained', () => {
    const pin = vi.fn()
    const closePane = vi.fn()
    const view = render(
      <SplitPaneAction {...actionProps(sid('s2'), [sid('s1')], { pin, closePane })} />,
    )
    fireEvent.click(view.getByRole('button'))
    expect(closePane).not.toHaveBeenCalled()
    expect(pin).toHaveBeenCalledOnce()
  })
})
