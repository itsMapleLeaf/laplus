import youtubei from "youtubei"
import { firstResolved, retryCount } from "./helpers/async.js"

const youtube = new youtubei.Client()

export type YoutubeVideo = youtubei.Video | youtubei.LiveVideo
export type RelatedResult = youtubei.VideoCompact | youtubei.PlaylistCompact

export async function findVideoByUserInput(
  input: string,
): Promise<YoutubeVideo | undefined> {
  return await firstResolved([
    () => youtube.getVideo(input),
    () => findVideoBySearchQuery(input),
  ])
}

async function findVideoBySearchQuery(query: string) {
  const partialVideo = await youtube.findOne(query, {
    type: "video",
  })

  return await (partialVideo as youtubei.VideoCompact)?.getVideo()
}

export async function* findRelated(
  video: YoutubeVideo,
): AsyncGenerator<RelatedResult[]> {
  let results
  while ((results = await tryGetNextRelated(video)).length > 0) {
    yield results
  }
}

async function tryGetNextRelated(
  video: YoutubeVideo,
): Promise<RelatedResult[]> {
  try {
    return await retryCount(3, () => video.nextRelated())
  } catch (error) {
    console.warn("Failed to load related videos:", error)
    return []
  }
}

export function isPlaylist(
  video: YoutubeVideo | RelatedResult,
): video is youtubei.PlaylistCompact {
  return video instanceof youtubei.PlaylistCompact
}

export function isLiveVideo(
  item: YoutubeVideo | RelatedResult,
): item is youtubei.LiveVideo | youtubei.VideoCompact {
  return (
    item instanceof youtubei.LiveVideo ||
    (item instanceof youtubei.VideoCompact && item.isLive)
  )
}
