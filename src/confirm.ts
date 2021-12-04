import type {
  ButtonComponentOptions,
  InteractionContext,
  RenderResult,
} from "@itsmapleleaf/gatekeeper"
import { buttonComponent } from "@itsmapleleaf/gatekeeper"

export function confirm({
  context,
  query,
  confirmLabel = "Confirm",
  confirmStyle = "PRIMARY",
  cancelLabel = "Cancel",
  cancelStyle = "SECONDARY",
  postChoiceContent = () => "Got it.",
}: {
  context: InteractionContext
  query: RenderResult
  confirmLabel?: string
  confirmStyle?: ButtonComponentOptions["style"]
  cancelLabel?: string
  cancelStyle?: ButtonComponentOptions["style"]
  postChoiceContent?: (choice: boolean) => RenderResult
}): Promise<boolean> {
  return new Promise((resolve) => {
    let choice: boolean | undefined

    context.ephemeralReply(() => {
      if (choice !== undefined) {
        return postChoiceContent(choice)
      }

      return [
        query,
        buttonComponent({
          label: confirmLabel,
          style: confirmStyle,
          onClick: () => {
            resolve((choice = true))
          },
        }),
        buttonComponent({
          label: cancelLabel,
          style: cancelStyle,
          onClick: () => {
            resolve((choice = false))
          },
        }),
      ]
    })
  })
}
