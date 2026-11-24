import { NextRequest } from "next/server"

export function withForwardedOrigin(request: NextRequest) {
  const forwardedHost = first(request.headers.get("x-forwarded-host"))
  const forwardedProto = first(request.headers.get("x-forwarded-proto")) || "http"
  if (!forwardedHost) return request
  const url = request.nextUrl.clone()
  const protocol = forwardedProto.endsWith(":") ? forwardedProto : `${forwardedProto}:`
  const { hostname, port } = splitHost(forwardedHost)
  if (url.protocol === protocol && url.hostname === hostname && url.port === port) return request
  url.protocol = protocol
  url.hostname = hostname
  url.port = port
  const headers = new Headers(request.headers)
  headers.set("x-forwarded-host", forwardedHost)
  headers.set("x-forwarded-proto", forwardedProto.replace(/:$/, ""))
  return new NextRequest(url, { headers, method: request.method, body: request.body, duplex: "half" })
}

function first(value: string | null) {
  return value?.split(",")[0]?.trim() ?? ""
}

function splitHost(host: string) {
  if (host.startsWith("[")) {
    const end = host.indexOf("]")
    const hostname = end === -1 ? host : host.slice(0, end + 1)
    const port = end !== -1 && host[end + 1] === ":" ? host.slice(end + 2) : ""
    return { hostname, port }
  }
  const split = host.lastIndexOf(":")
  if (split === -1) return { hostname: host, port: "" }
  return { hostname: host.slice(0, split), port: host.slice(split + 1) }
}
