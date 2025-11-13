"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const logout = () => {
    signOut();
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
        Loading authentication status...
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4 text-center">
          Facebook Page Login Demo
        </h1>

        <p className="text-center text-gray-600 mb-6 text-lg">
          Current Status:{" "}
          <span
            className={`font-semibold ${
              session ? "text-green-600" : "text-red-500"
            }`}
          >
            {session ? "Signed In" : "Signed Out"}
          </span>
        </p>

        {session ? (
          <div className="flex flex-col items-center space-y-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-28 h-28 rounded-full shadow-lg mb-3"
              />
            )}

            <p className="text-gray-700 font-medium">
              Welcome back, {session.user?.name || "User"}!
            </p>
            <p className="text-gray-600">Email: {session.user?.email}</p>

            <Link
              href="/dashboard"
              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-md transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Dashboard (Protected)
            </Link>

            <div className="w-full bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-700 overflow-x-auto">
              <p className="font-medium text-gray-900 mb-1">🔑 Full Session Object:</p>
              <pre className="whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            <div className="w-full bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-700 overflow-x-auto">
              <p className="font-medium mb-1">Access Token:</p>
              <code className="block text-xs break-all text-gray-800">
                {session.accessToken || "Token not available."}
              </code>
            </div>

            <button
              onClick={logout}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl shadow-md transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={() => signIn("facebook")}
              className="flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.987h-2.54v-2.892h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.196 2.238.196v2.465h-1.26c-1.242 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.892h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
              </svg>
              <span className="font-medium">Sign in with Facebook</span>
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Requires a Facebook Page and Meta Developer App configuration.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
