import type {
  MessageOptions,
  MessagePayload,
  TextBasedChannels,
} from "discord.js"
import { errorEmbedOptions } from "./error-embed.js"
import { logErrorStack } from "./helpers/errors.js"

export function createTextChannelPresence() {
  let textChannel: TextBasedChannels | undefined

  function setTextChannel(channel: TextBasedChannels) {
    textChannel = channel
  }

  function send(content: string | MessagePayload | MessageOptions) {
    textChannel?.send(content).catch((error) => {
      console.warn("Failed to send message to text channel:", error)
    })
  }

  function reportError(error: unknown) {
    send({ embeds: [errorEmbedOptions(error)] })
    logErrorStack(error)
  }

  return {
    setTextChannel,
    send,
    reportError,
  }
}
