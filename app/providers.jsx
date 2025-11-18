"use client";

import { SessionProvider } from "next-auth/react";
import { Analytics } from '@vercel/analytics/next';

/**
 * Client component to wrap the entire application in the NextAuth SessionProvider.
 * This makes the session context available to all client components using useSession().
 */
export function Providers({ children }) {
  return <SessionProvider>
    {children}
    <Analytics />
    </SessionProvider>;
}