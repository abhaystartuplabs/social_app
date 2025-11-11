import NextAuth from "next-auth";
import InstagramProvider from "next-auth/providers/instagram"; // if using built-in (may require update)

export const authOptions = {
  providers: [
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    }),
  ],
  // Optional: customize pages, session strategy, etc.
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
