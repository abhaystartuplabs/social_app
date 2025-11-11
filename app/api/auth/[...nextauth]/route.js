import NextAuth from "next-auth";
import InstagramProvider from "next-auth/providers/instagram";

// Define the configuration options for NextAuth.js
const authOptions = {
  providers: [
    InstagramProvider({
      // Client ID and Secret are loaded securely from the .env.local file
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      
      // Instagram uses the 'basic' scope by default. You can request more if needed, 
      // but they require App Review. 'user_profile' and 'user_media' are standard.
      // This is for the Instagram Basic Display API
      authorization: {
        params: {
          scope: "user_profile,user_media", // Request necessary permissions
        },
      },
    }),
  ],
  // Optional: Define custom pages for sign in, sign out, etc.
  pages: {
    signIn: "/login", // Redirects users to a custom login page if needed
  },
  // Optional: Set up callbacks for session handling
  callbacks: {
    // This callback is useful for exposing user data (like tokens) in the session object
    async jwt({ token, account }) {
      if (account) {
        // Persist the access_token to the token right after sign in
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like the access token, for use in the frontend
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

// Export the handler functions for Next.js to use
const handler = NextAuth(authOptions);

// Use this file for both GET and POST requests to the /api/auth/[...nextauth] path
export { handler as GET, handler as POST };

// IMPORTANT: You will also need to create a helper file to use the session 
// hooks safely in client components.