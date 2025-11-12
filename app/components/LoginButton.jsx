"use client";

import { signIn, signOut, useSession } from "next-auth/react";

/**
 * Client component to initiate sign-in/sign-out and display user status.
 * Requires SessionProvider to be active (done in app/layout.jsx).
 */
export function LoginButton() {
  // useSession() pulls context from the global SessionProvider
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="text-gray-500">Loading authentication status...</div>;
  }

  if (session) {
    // Signed In View
    return (
      <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-green-600">
          Signed in successfully!
        </h2>
        <p className="text-gray-700 mb-4">
          Welcome, {session.user?.name || "Instagram User"}!
        </p>
        <button
          onClick={() => signOut()}
          className="px-6 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition duration-150 shadow-md"
        >
          Sign Out
        </button>
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600 w-full overflow-x-auto text-left">
          <p className="font-medium">Access Token (Shortened):</p>
          <code className="block whitespace-pre-wrap break-all">
            {session.accessToken ? `...${session.accessToken.slice(-15)}` : "Token not available."}
          </code>
        </div>
      </div>
    );
  }

  // Signed Out View
  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Login to Instagram
      </h1>
      <button
        onClick={() => signIn("facebook")} // Initiates the Instagram OAuth flow
        className="flex items-center justify-center space-x-2 w-full px-6 py-3 text-white bg-pink-600 rounded-xl hover:bg-pink-700 transition duration-300 shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2.7l-.3.2c-1.8 1.4-2.8 3.5-2.8 5.7v8c0 2 1.6 3.6 3.6 3.6h8c2 0 3.6-1.6 3.6-3.6V10.7c0-2.2-1-4.3-2.8-5.7l-.3-.2C17 4.1 16 4 14.2 4H9.8c-1.8 0-2.8.1-3.2.7zM12 7.7a4.3 4.3 0 100 8.6 4.3 4.3 0 000-8.6zm0 1.6a2.7 2.7 0 110 5.4 2.7 2.7 0 010-5.4zM18.8 4.6a1 1 0 100 2 1 1 0 000-2z"/>
        </svg>
        <span className="font-medium">Sign in with Instagram</span>
      </button>
      <p className="mt-4 text-xs text-gray-500">
        Requires configuration in the Meta Developer Dashboard.
      </p>
    </div>
  );
}