import clsx from 'clsx'
import type { ConversationSlotProps } from '../contract/slots.ts'
import { conversationPhase } from '../contract/snapshot.ts'
import { ConversationWidthControls } from './ConversationWidthControls.tsx'
import { ConversationPane } from './ConversationPane.tsx'
import css from './ConversationRoot.module.css'

const CONTENT_SLOTS = { widthControls: ConversationWidthControls }

/**
 * Render the existing main Conversation frame around the extracted content,
 * plus one retained column per open side pane.
 * @param props - the original `main.conversation` Slot props.
 * @returns the split frame, the unchanged main column, and any side panes.
 */
export function ConversationMainPanel(props: ConversationSlotProps) {
  const {
    sessionId, useSession, useSessions, useConversation, usePanes, closePane, t,
    renderSlot, renderFactorySlot, SessionProvider,
  } = props
  const session = useSession(s => s)
  const conversation = useConversation(s => s)
  const shellPhase = session === undefined || conversation === undefined
    ? 'blank'
    : conversationPhase(session, conversation)
  const openState = session?.openState
  const summaries = useSessions(s => s.byId)
  const summaryBlank = sessionId === undefined ? undefined : summaries[sessionId]?.blank
  const panes = usePanes(value => value)

  // While a session is still replaying (loading + blank) the hero/docked
  // choice is unknowable — render the composer hidden instead of flashing
  // the centered hero and snapping to the docked bar (or vice versa).
  // Exemption: a session the list summary already proves blank can only
  // land on the hero, so hiding would blank the column for the whole
  // history round-trip (the startup auto-selection flash) for nothing.
  // The exemption is deliberately open-state-wide, not loading-only: a
  // summary-blank session is the hero before its open starts (`cold`) and
  // after one fails (`error`) for the same reason — there is no history.
  // A restored continuable subagent waits for a Host summary to establish
  // parent availability. This keeps the composer
  // hidden instead of briefly rendering the parent-offline takeover.
  const parentAvailabilityPending = session?.subagent?.address.mode === 'continuable'
    && session.subagent.parentAvailable === undefined
  const settling = sessionId !== undefined && (
    (shellPhase === 'blank' && openState === 'loading' && summaryBlank !== true)
    || parentAvailabilityPending
  )
  const hero = sessionId === undefined
    || (shellPhase === 'blank' && (openState === 'open' || summaryBlank === true))
  const phase = settling ? 'settling' : hero ? 'hero' : 'active'

  // The current Session's own header/content stay the main column; every other
  // open pane renders its own retained Conversation beside it.
  const visiblePanes = panes.filter(pane => pane.sessionId !== sessionId)

  return (
    <div className={css.split}>
      <div className={clsx(css.root, css.main)} data-phase={phase}>
        {renderSlot('conversation.header', {})}
        {renderFactorySlot('conversation.content', {
          variant: 'main',
          phase,
          hero,
        }, {
          slots: CONTENT_SLOTS,
        })}
      </div>
      {visiblePanes.map((pane) => {
        const summary = summaries[pane.sessionId]
        const paneHero = summary === undefined || summary.blank === true
        return (
          <ConversationPane
            key={pane.sessionId}
            view={pane}
            phase={paneHero ? 'hero' : 'active'}
            hero={paneHero}
            title={summary?.displayTitle}
            SessionProvider={SessionProvider}
            renderFactorySlot={renderFactorySlot}
            closePane={closePane}
            t={t}
          />
        )
      })}
    </div>
  )
}
