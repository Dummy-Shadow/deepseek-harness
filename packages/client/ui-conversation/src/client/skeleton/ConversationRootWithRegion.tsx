/** Register-time ConversationRoot wrapper: threads the renderer session-region seat. */

import type { ReactNode } from 'react'
import type { SessionRegionComponent } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { ConversationSlotProps } from '../contract/slots.ts'
import { ConversationRoot } from './ConversationRoot.tsx'

/**
 * Compose the register component for the `conversation` entry. The region
 * seat is a renderer service value the apply closure holds, so it is passed
 * through here (a plain prop) instead of entering the four-share props.
 * @param sessionRegion - renderer-delivered session-region component.
 * @returns a component satisfying the register contract.
 */
export function conversationRootWithRegion(
  sessionRegion: SessionRegionComponent,
): (props: ConversationSlotProps) => ReactNode {
  return props => <ConversationRoot {...props} sessionRegion={sessionRegion} />
}
