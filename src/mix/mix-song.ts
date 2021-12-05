import { z } from "zod"

export type MixSong = z.infer<typeof mixSongSchema>

export const mixSongSchema = z.object({
  title: z.string(),
  durationSeconds: z.number(),
  thumbnailUrl: z.string().optional(),
  channelName: z.string().optional(),
  channelUrl: z.string().optional(),
  channelAvatarUrl: z.string().optional(),
  youtubeId: z.string(),
})
