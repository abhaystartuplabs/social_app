import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'NextAuth Instagram Login',
  description: 'Login with Instagram using Next.js App Router and Auth.js',
};

// The Root Layout is a Server Component by default.
export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap the children with the client-side Providers component */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}