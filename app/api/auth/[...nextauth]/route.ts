import { handlers } from "@/auth"
import { withForwardedOrigin } from "@/lib/request-origin"

export function GET(request: Request) {
  return handlers.GET(withForwardedOrigin(request as never))
}

export function POST(request: Request) {
  return handlers.POST(withForwardedOrigin(request as never))
}
