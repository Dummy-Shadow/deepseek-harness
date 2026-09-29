/**
 * One retained side pane: a full second Conversation beside the main column.
 *
 * The pane binds the framework SessionProvider to the pane's own
 * `SessionReference`, so every Session-scoped seat inside (transcript, view
 * tabs, composer) resolves to the pane's Session. Its width is a
 * component-private preference persisted per Session; the primary column
 * keeps the rest.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import clsx from 'clsx'
import type { RenderFactorySlot, SessionProviderComponent, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationPaneView } from '../panes.ts'
import type { ConversationContentInputProps } from '../contract/slots.ts'
import css from './ConversationRoot.module.css'

/** Narrowest pane that still fits the composer card. */
const PANE_MIN_WIDTH = 320
/** Widest pane before the main column loses its own minimum. */
const PANE_MAX_WIDTH = 720
/** Width a pane opens at. */
const PANE_DEFAULT_WIDTH = 420
/** localStorage key prefix; one entry per Session. */
const PANE_WIDTH_KEY = 'dsh.conversation.paneWidth'

function clampWidth(width: number): number {
  return Math.min(PANE_MAX_WIDTH, Math.max(PANE_MIN_WIDTH, Math.round(width)))
}

function readWidth(sessionId: SessionId): number {
  const raw = localStorage.getItem(`${PANE_WIDTH_KEY}.${sessionId}`)
  if (raw === null) return PANE_DEFAULT_WIDTH
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? clampWidth(parsed) : PANE_DEFAULT_WIDTH
}

function persistWidth(sessionId: SessionId, width: number): void {
  localStorage.setItem(`${PANE_WIDTH_KEY}.${sessionId}`, String(width))
}

/** Props of one side pane column. */
export interface ConversationPaneProps {
  readonly view: ConversationPaneView
  readonly phase: ConversationContentInputProps['phase']
  readonly hero: boolean
  readonly title: string | undefined
  readonly SessionProvider: SessionProviderComponent
  readonly renderFactorySlot: RenderFactorySlot
  readonly closePane: (sessionId: SessionId) => void
  readonly t: TranslateNS<'conversation'>
}

interface DragState {
  readonly pointerId: number
  readonly startX: number
  readonly startWidth: number
}

/**
 * Render one side pane and its resize handle.
 * @param props - pane target, resolved phase/title, provider seats, close callback, and copy.
 * @returns the pane column.
 */
export function ConversationPane({
  view, phase, hero, title, SessionProvider, renderFactorySlot, closePane, t,
}: ConversationPaneProps) {
  const [width, setWidth] = useState(() => readWidth(view.sessionId))
  const drag = useRef<DragState | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.setAttribute('data-dragging', '')
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = drag.current
    if (state === null || state.pointerId !== event.pointerId) return
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setWidth(clampWidth(state.startWidth + (state.startX - event.clientX)))
  }
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = drag.current
    if (state === null || state.pointerId !== event.pointerId) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    event.currentTarget.removeAttribute('data-dragging')
    const next = clampWidth(state.startWidth + (state.startX - event.clientX))
    setWidth(next)
    persistWidth(view.sessionId, next)
  }

  return (
    <div
      className={clsx(css.root, css.pane)}
      data-phase={phase}
      data-conversation-pane={view.sessionId}
      style={{ width }}
    >
      <div className={css.paneHeader}>
        <span className={css.paneTitle}>{title ?? view.sessionId}</span>
        <Button
          size="sm"
          className={css.paneClose}
          aria-label={t('pane.close')}
          onClick={() => { closePane(view.sessionId) }}
        >
          <IconCloseOutlineRegular className={css.paneIcon} />
        </Button>
      </div>
      <div
        className={css.paneResize}
        role="separator"
        aria-orientation="vertical"
        aria-label={t('pane.resize')}
        data-pane-resize
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <SessionProvider session={view.reference}>
        {renderFactorySlot('conversation.content', { variant: 'main', phase, hero })}
      </SessionProvider>
    </div>
  )
}
