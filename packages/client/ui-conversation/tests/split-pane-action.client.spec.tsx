// @vitest-environment jsdom
/** SplitPaneAction behavior: renders while no pane is retained and pins on click. */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { SplitPaneAction, type SplitPaneActionProps } from '../src/client/skeleton/SplitPaneAction.tsx'
import { NS } from '../src/client/locales.ts'

const sid = (id: string) => id as SessionId

/** Minimal props: the component only reads the pane roster, `t`, and `pin`. */
function actionProps(panes: readonly SessionId[], pin: () => void): SplitPaneActionProps {
  const useSessionPanes = (() => panes) as unknown as SplitPaneActionProps['useSessionPanes']
  const t: TranslateNS<typeof NS> = key => key as string
  return { useSessionPanes, pin, t } as unknown as SplitPaneActionProps
}

describe('SplitPaneAction', () => {
  it('renders the trigger and pins the header Session on click while no pane is retained', () => {
    const pin = vi.fn()
    const view = render(<SplitPaneAction {...actionProps([], pin)} />)
    const button = view.getByRole('button')
    expect(button).toBeTruthy()
    fireEvent.click(button)
    expect(pin).toHaveBeenCalledOnce()
  })

  it('hides while any Session is already retained as the pane', () => {
    const pin = vi.fn()
    const view = render(<SplitPaneAction {...actionProps([sid('s1')], pin)} />)
    expect(view.container.querySelector('button')).toBeNull()
    expect(pin).not.toHaveBeenCalled()
  })
})
