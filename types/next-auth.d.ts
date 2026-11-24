import type { DefaultSession } from "next-auth"
import type { Provider } from "@/lib/types"

declare module "next-auth" {
  interface Session {
    provider?: Provider
    user?: DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: Provider
  }
}
