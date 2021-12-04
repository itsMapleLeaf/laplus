import type { RequestInit } from "node-fetch"
import fetch from "node-fetch"
import type { JsonValue } from "type-fest"

// requires that the gist is already created lol
// eslint-disable-next-line import/no-unused-modules
export function createJsonGist(gistId: string, fileName: string) {
  return {
    async load(): Promise<JsonValue> {
      const data: any = await githubFetch(
        `https://api.github.com/gists/${gistId}`,
      )

      const content = data?.files?.[fileName]?.content
      if (!content) {
        throw new Error("Gist is empty")
      }

      return JSON.parse(content)
    },

    async save(data: JsonValue): Promise<void> {
      await githubFetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        body: {
          files: { [fileName]: { content: JSON.stringify(data, null, 2) } },
        },
      })
    },
  }
}

async function githubFetch(
  url: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    body?: JsonValue
    headers?: { [key: string]: string }
  },
) {
  const init: RequestInit = {
    method: options?.method || "GET",
    headers: {
      "Authorization": `token ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
      ...options?.headers,
    },
  }

  if (options?.body && options.method !== "GET") {
    init.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return response.json()
}
