import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { checkCredential } from "@/lib/credentials"
import type { Provider } from "@/lib/types"

function readEnv(name: string) {
  return process.env[name]?.trim() ?? ""
}

const providers = []
const googleId = readEnv("AUTH_GOOGLE_ID")
const googleSecret = readEnv("AUTH_GOOGLE_SECRET")
if (googleId && googleSecret) {
  providers.push(Google({ clientId: googleId, clientSecret: googleSecret }))
}
const microsoftId = readEnv("AUTH_MICROSOFT_ID")
const microsoftSecret = readEnv("AUTH_MICROSOFT_SECRET")
if (microsoftId && microsoftSecret) {
  const tenant = readEnv("AUTH_MICROSOFT_TENANT") || "common"
  providers.push(
    MicrosoftEntraID({
      clientId: microsoftId,
      clientSecret: microsoftSecret,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    }),
  )
}

providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "")
      const password = String(credentials?.password ?? "")
      const account = await checkCredential(email, password)
      if (!account) return null
      return { id: account.email, email: account.email, name: account.name }
    },
  }),
)

function asProvider(value: unknown): Provider | undefined {
  if (value === "google" || value === "microsoft" || value === "email") return value
  return undefined
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  secret: readEnv("AUTH_SECRET") || "dev-only-ux-review-secret",
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    jwt({ token, account, profile, user }) {
      if (account?.provider === "google") token.provider = "google"
      else if (account?.provider === "microsoft-entra-id") token.provider = "microsoft"
      else if (account?.provider === "credentials") token.provider = "email"
      const record = profile as { email?: string; preferred_username?: string } | undefined
      const email = record?.email || record?.preferred_username || user?.email
      if (email) token.email = email.toLowerCase()
      if (user?.name) token.name = user.name
      return token
    },
    session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = String(token.email)
        if (token.name) session.user.name = String(token.name)
      }
      session.provider = asProvider(token.provider)
      return session
    },
  },
})
