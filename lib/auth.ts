import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getCsrfToken } from 'next-auth/react'
import { SiweMessage } from 'siwe'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
          placeholder: '0x0',
        },
        signature: {
          label: 'Signature',
          type: 'text',
          placeholder: '0x0',
        },
      },
      async authorize(credentials, req) {
        try {
          const siwe = new SiweMessage(JSON.parse(credentials?.message || '{}'))
          
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000')
          const result = await siwe.verify({
            signature: credentials?.signature || '',
            domain: nextAuthUrl.host,
            nonce: await getCsrfToken({ req }),
          })

          if (result.success) {
            // Get or create user in database
            let user = await db.query(`
              SELECT id, address, username, email FROM users WHERE address = $1
            `, [siwe.address])

            if (!user.rows[0]) {
              // Create new user
              user = await db.query(`
                INSERT INTO users (address) VALUES ($1) 
                RETURNING id, address, username, email
              `, [siwe.address])
            }

            const userData = user.rows[0]
            return {
              id: userData.id,
              address: siwe.address,
              username: userData.username,
              email: userData.email,
            }
          }
          
          return null
        } catch (e) {
          console.error('Authentication error:', e)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.address = user.address
        token.username = user.username
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      session.user.address = token.address as string
      session.user.username = token.username as string
      session.user.email = token.email as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    address: string
    username?: string
    email?: string
  }

  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    address: string
    username?: string
    email?: string
  }
}