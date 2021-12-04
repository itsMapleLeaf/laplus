import EventEmitter from "events"
import type { ClientRequestArgs } from "http"
import prettyMilliseconds from "pretty-ms"
import type { ClientOptions, RawData } from "ws"
import { WebSocket } from "ws"

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface SocketEvents extends EventEmitter {
  on(event: "open", listener: () => void): this
  on(event: "message", listener: (data: RawData) => void): this
}

const reconnectPeriodMs = 5000

export function createSocket() {
  const events: SocketEvents = new EventEmitter()
  let socket: WebSocket | undefined

  function connect(
    url: string,
    options?: ClientOptions | ClientRequestArgs | undefined,
  ) {
    if (socket) return

    console.info(`Connecting to ${url}`)

    socket = new WebSocket(url, options)

    socket.onopen = () => {
      events.emit("open")
    }

    socket.onmessage = (event) => {
      events.emit("message", event.data)
    }

    socket.onerror = (err) => {
      console.warn(`Failed to connect to ${url}.`, err.message)
    }

    socket.onclose = () => {
      console.warn(
        `Connection to ${url} closed. Reconnecting in ${prettyMilliseconds(
          reconnectPeriodMs,
        )}`,
      )
      setTimeout(() => {
        socket = undefined
        connect(url, options)
      }, reconnectPeriodMs)
    }
  }

  function send(data: string) {
    socket?.send(data)
  }

  return {
    connect,
    send,
    events,
  }
}
