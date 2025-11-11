"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      {!session ? (
        <>
          <h1 className="text-2xl font-bold mb-4">Login with Instagram</h1>
          <button
            onClick={() => signIn("instagram")}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
          >
            Login with Instagram
          </button>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold mb-4">Welcome, {session.user.name || "User"}</h1>
          <p>Access Token: {session.accessToken}</p>
          <button
            onClick={() => signOut()}
            className="bg-gray-800 text-white px-4 py-2 mt-4 rounded-lg"
          >
            Logout
          </button>
        </>
      )}
    </div>
  );
}
