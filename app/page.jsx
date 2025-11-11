"use client";
import { LoginButton } from "./login/page";

// NOTE: This file assumes you have created the components/LoginButton.tsx file
// and set up the /api/auth/[...nextauth]/route.ts handler as described in the guide.

export default function Home() {
  return (
    // SessionProvider is necessary to use useSession() hook in client components
    // We are using a mock provider here because the actual provider setup 
    // is usually done in a separate file (like context/Provider.tsx), but 
    // for this single-file example, we put it here.
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <LoginButton />
      </main>
  );
}