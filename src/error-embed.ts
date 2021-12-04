import type { MessageEmbedOptions } from "discord.js"
import { toError } from "./helpers/errors.js"
import { isTruthy } from "./helpers/is-truthy.js"

export function errorEmbedOptions(
  error: unknown,
  url?: string,
): MessageEmbedOptions {
  return {
    color: "#B91C1C",
    title: "Something went wrong.",
    fields: [
      { name: "Error Message", value: toError(error).message },
      url && { name: "Url", value: url },
    ].filter(isTruthy),
    footer: {
      text: flavorText[Math.floor(Math.random() * flavorText.length)],
    },
  }
}

const flavorText = [
  "Do it right next time, doofus.",
  "Is this my fault? Probably, but I'm going to blame you anyway.",
  "Stop breaking shit.",
  "Computers were a mistake.",
  "I hate YouTube. This is a YouTube problem, isn't it?",
  "I think you've had enough computer for today.",
  "Eh, probably would've gone right on some other planet.",
  "You tried.",
  "I'm not sure what you tried, but it definitely didn't end well.",
  "It's not a bug, it's a feature. I swear.",
  "Linux moment? Linux moment.",
  'Maybe you should try playing "Can I Friend You on Bassbook? lol" by Camellia feat. Nanahira instead.',
  "I hate JavaScript.",
]
