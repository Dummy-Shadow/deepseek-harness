/** Session-header split-view trigger: pins the current Session as the read-only pane. */

import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'
import css from './SplitPaneAction.module.css'

/** Business face of the split action: pin the current Session, plus its pane roster. */
export interface SplitPaneActionInjected {
  /** Retained side-pane Session roster (see the Session Controller `panes`). */
  hooks: { sessionPanes: ObservableSnapshot<readonly SessionId[]> }
  /** Pin the header's own Session into the read-only pane column. */
  pin: () => void
}

/** Full props for the session-header split action. */
export type SplitPaneActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof NS>
  & InjectFace<SplitPaneActionInjected>

/**
 * Render the split trigger. One side pane at a time: while any Session is
 * already pinned the trigger hides (the pane column or its close button owns
 * the active state).
 * @param props - the pane roster and the pinned pin action.
 * @returns the trigger, or null while a pane is already retained.
 */
export function SplitPaneAction({
  useSessionPanes, pin, t,
}: SplitPaneActionProps) {
  const panes = useSessionPanes(value => value)
  if (panes.length > 0) return null
  return (
    <button
      type="button"
      className={css.action}
      title={t('split.openLabel')}
      aria-label={t('split.openLabel')}
      onClick={pin}
    >
      {t('split.open')}
    </button>
  )
}
