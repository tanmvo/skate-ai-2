import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { trackAuthSuccess, trackGoogleOAuthEvent, getEmailDomain } from "@/lib/analytics/auth-tracking"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id

        // Track successful authentication
        if (account) {
          const authMethod = account.provider === 'google' ? 'google' : 'email'
          const eventType = user.emailVerified ? 'auth_signin_success' : 'auth_signup_success'

          await trackAuthSuccess(eventType, {
            method: authMethod,
            user_id: user.id,
            email_domain: user.email ? getEmailDomain(user.email) : undefined,
            signup_source: authMethod === 'google' ? 'google_oauth' : 'direct_link',
          }, user.id)

          // Track Google OAuth specific events
          if (account.provider === 'google') {
            await trackGoogleOAuthEvent('google_oauth_success', {
              callback_url: account.callbackUrl,
              state: account.state,
            })
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  }
})