import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
const providers = []
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  )
}
if (process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET) {
  const tenant = process.env.AUTH_MICROSOFT_TENANT?.trim() || "common"
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_SECRET,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-only-ux-review-secret"),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
        token.provider = account.provider === "google" ? "google" : "microsoft"
      }
      const record = profile as { email?: string; preferred_username?: string } | undefined
      const email = record?.email || record?.preferred_username
      if (email) token.email = email.toLowerCase()
      return token
    },
    session({ session, token }) {
      if (session.user && token.email) session.user.email = String(token.email)
      session.provider = token.provider === "microsoft" || token.provider === "google" ? token.provider : undefined
      return session
    },
  },
})
