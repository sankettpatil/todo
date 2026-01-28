import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            id: "guest-login",
            name: "Guest",
            credentials: {
                id: { label: "ID", type: "text" }
            },
            async authorize(credentials) {
                if (credentials?.id) {
                    return {
                        id: credentials.id,
                        name: "Guest User",
                        email: `${credentials.id}@stickyboard.local`, // Fake email for backend compatibility
                        image: null
                    };
                }
                return null;
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                // Ensure email persists if needed, mostly handled by default
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        }
    },
    session: {
        strategy: "jwt",
    }
});

export { handler as GET, handler as POST };
