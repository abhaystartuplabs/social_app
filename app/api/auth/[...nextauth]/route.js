import NextAuth from "next-auth";

export const authOptions = {
  providers: [
    {
      id: "instagram", // must match signIn("instagram")
      name: "Instagram",
      type: "oauth",
      version: "2.0",
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      authorization: "https://api.instagram.com/oauth/authorize?scope=user_profile",
      token: "https://api.instagram.com/oauth/access_token",
      userinfo: "https://graph.instagram.com/me?fields=id,username",
      profile(profile) {
        return {
          id: profile.id,
          name: profile.username,
        };
      },
    },
  ],
  pages: {
    signIn: "/login", // your custom login page
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
