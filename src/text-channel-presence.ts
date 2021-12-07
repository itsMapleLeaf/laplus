import type {
  MessageOptions,
  MessagePayload,
  TextBasedChannels,
} from "discord.js"
import { errorEmbedOptions } from "./error-embed.js"
import { logErrorStack } from "./helpers/errors.js"

export class TextChannelPresence {
  channel: TextBasedChannels | undefined

  setChannel = (channel: TextBasedChannels) => {
    this.channel = channel
  }

  send = (content: string | MessagePayload | MessageOptions) => {
    this.channel?.send(content).catch((error) => {
      console.warn("Failed to send message to text channel:", error)
    })
  }

  reportError = (error: unknown) => {
    this.send({ embeds: [errorEmbedOptions(error)] })
    logErrorStack(error)
  }
}
