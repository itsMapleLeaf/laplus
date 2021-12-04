import type {
  InteractionContext,
  RenderReplyFn,
  RenderResult,
  ReplyHandle,
} from "@itsmapleleaf/gatekeeper"
import { autorun } from "mobx"
import { throttle } from "./helpers/async.js"

export function observerReply(
  context: InteractionContext,
  renderFn: RenderReplyFn,
  { throttleUpdatesMs = 500 } = {},
) {
  let reply: ReplyHandle | undefined
  let content: RenderResult

  const refresh = throttle(throttleUpdatesMs, () => reply?.refresh())

  const unsubscribe = autorun(() => {
    content = renderFn()
    if (!reply) {
      reply = context.reply(() => content)
    } else {
      refresh()
    }
  })

  return {
    get message() {
      return reply?.message
    },
    refresh: () => {
      content = renderFn()
      refresh()
    },
    delete: () => {
      reply?.delete()
      unsubscribe()
    },
    unsubscribe,
  }
}
