import { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { Client, Intents } from "discord.js"
import "dotenv/config.js"
import { configure } from "mobx"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { connectToLavalink } from "./lavalink.js"
import { textChannelPresence } from "./singletons.js"

configure({
  enforceActions: "never",
})

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
})

client.on("interactionCreate", (interaction) => {
  if (interaction.channel) {
    textChannelPresence.setTextChannel(interaction.channel)
  }
})

await Gatekeeper.create({
  name: "laplus",
  client,
  commandFolder: join(dirname(fileURLToPath(import.meta.url)), "commands"),
})

await client.login(process.env.BOT_TOKEN)

connectToLavalink(client)
