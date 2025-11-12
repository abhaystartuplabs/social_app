"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function LoginButton() {
  const { data: session, status } = useSession();

  console.log("🔍 Session Data:", session);

  if (status === "loading") {
    return <div className="text-gray-500">Loading authentication status...</div>;
  }

  if (session) {
    return (
      <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-lg text-left">
        <h2 className="text-2xl font-semibold mb-3 text-green-600">
          ✅ Signed in successfully!
        </h2>
        <p className="text-gray-700 mb-2">
          <strong>Name:</strong> {session.user?.name || "N/A"}
        </p>
        <p className="text-gray-700 mb-2">
          <strong>Email:</strong> {session.user?.email || "N/A"}
        </p>
        {session.user?.image && (
          <img
            src={session.user.image}
            alt="Profile"
            className="w-24 h-24 rounded-full my-3 shadow-md"
          />
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700 w-full overflow-x-auto border border-gray-200">
          <p className="font-medium text-gray-900 mb-1">🔑 Full Session Object:</p>
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600 w-full overflow-x-auto text-left border border-gray-200">
          <p className="font-medium">Access Token:</p>
          <code className="block whitespace-pre-wrap break-all text-gray-800">
            {session.accessToken || "Token not available."}
          </code>
        </div>

        <button
          onClick={() => signOut()}
          className="mt-4 px-6 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition duration-150 shadow-md"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Login with Facebook Page
      </h1>
      <button
        onClick={() => signIn("facebook")} // Login with Facebook
        className="flex items-center justify-center space-x-2 w-full px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition duration-300 shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.987h-2.54v-2.892h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.196 2.238.196v2.465h-1.26c-1.242 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.892h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
        </svg>
        <span className="font-medium">Sign in with Facebook</span>
      </button>
      <p className="mt-4 text-xs text-gray-500">
        Requires a Facebook Page and Meta Developer App configuration.
      </p>
    </div>
  );
}
