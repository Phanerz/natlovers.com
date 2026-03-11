import type {NextAuthConfig} from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        if (credentials.email === "admin@natlovers.com" && credentials.password === "natlovers-admin") {
          return {id: "admin", email: "admin@natlovers.com", name: "Natlovers Admin", role: "ADMIN"};
        }

        return {id: "customer", email: String(credentials.email), name: "Natlovers Customer", role: "CUSTOMER"};
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.role = (user as {role?: string}).role;
      }

      return token;
    },
    async session({session, token}) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
      }

      return session;
    }
  }
} satisfies NextAuthConfig;
