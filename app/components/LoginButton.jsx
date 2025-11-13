"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LoginButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to home if already signed in
  useEffect(() => {
    if (session) {
      router.push("./");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
        Loading authentication status...
      </div>
    );
  }

  // Show login UI only if not signed in
  if (!session) {
    return (
      <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Login with Facebook Page
        </h1>
        <button
          onClick={() => signIn("facebook")} // Login with Facebook
          className="flex items-center justify-center space-x-2 w-full px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition duration-300 shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.987h-2.54v-2.892h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.196 2.238.196v2.465h-1.26c-1.242 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.892h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
          </svg>
          <span className="font-medium">Sign in with Facebook</span>
        </button>
        <p className="mt-4 text-xs text-gray-500 text-center">
          Requires a Facebook Page and Meta Developer App configuration.
        </p>
      </div>
    );
  }

  // Optionally, you can show a "Redirecting..." message while router.push executes
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
      Redirecting...
    </div>
  );
}
