/**
 * Conversation header action that toggles this Session as a side split pane.
 *
 * Additive: pressing it while this Session is already pinned a pane closes
 * that pane, and pressing it from another header opens a new pane beside the
 * main column. Several panes can be open at once; each is a retained
 * `SessionReference` rendered through the framework SessionProvider.
 */
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Button, IconCompareSplitOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConversationPaneView } from '../panes.ts'
import { NS } from '../locales.ts'
import css from './SplitPaneAction.module.css'

/** Registration-side face for the split-pane header action. */
export interface SplitPaneInjected {
  hooks: {
    /** Open side panes, bound by the renderer as `usePanes`. */
    panes: HostObservable<readonly ConversationPaneView[]>
  }
  /** Open this Session as a pane, or close it when already open. */
  togglePane: (sessionId: SessionId) => void
}

/** Full props of the split-pane header action. */
export type SplitPaneActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof NS>
  & InjectFace<SplitPaneInjected>

/**
 * Render the split-pane trigger for one Session's header.
 * @param props - the Session id, the panes snapshot hook, the toggle callback, and copy.
 * @returns the trigger button.
 */
export function SplitPaneAction({ sessionId, usePanes, togglePane, t }: SplitPaneActionProps) {
  const open = usePanes(views => views.some(view => view.sessionId === sessionId))
  const label = t(open ? 'pane.close' : 'pane.open')
  return (
    <Tooltip label={label} side="bottom" delayMs={500}>
      <Button
        size="sm"
        className={css.button}
        aria-label={label}
        aria-pressed={open}
        data-split-pane={open ? 'open' : 'closed'}
        onClick={() => { togglePane(sessionId) }}
      >
        <IconCompareSplitOutlineRegular className={css.icon} />
      </Button>
    </Tooltip>
  )
}
