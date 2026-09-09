/** Session-header split-view trigger: pins the current Session as the single read-only pane. */

import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'
import css from './SplitPaneAction.module.css'

/** Business face of the split action: pin/close against the Session Controller. */
export interface SplitPaneActionInjected {
  /** Retained side-pane Session roster (see the Session Controller `panes`). */
  hooks: { sessionPanes: ObservableSnapshot<readonly SessionId[]> }
  /** Pin the header's own Session as the single pane. */
  pin: () => void
  /** Close one retained side-pane Session by identity. */
  closePane: (id: SessionId) => void
}

/** Full props for the session-header split action. */
export type SplitPaneActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof NS>
  & InjectFace<SplitPaneActionInjected>

/**
 * Render the split trigger. Pinning is additive: each Session keeps its own
 * toggle, so several Sessions can be retained as panes at once; when the
 * header's own Session is already a pane the trigger closes just that one.
 * @param props - the current Session identity, the pane roster, and the actions.
 * @returns the trigger.
 */
export function SplitPaneAction({
  sessionId, useSessionPanes, pin, closePane, t,
}: SplitPaneActionProps) {
  const panes = useSessionPanes(value => value)
  const pinned = sessionId !== undefined && panes.includes(sessionId)
  const label = pinned ? t('split.close') : t('split.open')
  return (
    <button
      type="button"
      className={css.action}
      title={pinned ? t('pane.close') : t('split.openLabel')}
      aria-label={pinned ? t('pane.close') : t('split.openLabel')}
      onClick={() => {
        if (pinned) {
          closePane(sessionId)
          return
        }
        pin()
      }}
    >
      {label}
    </button>
  )
}
