import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from './api/auth/[...nextauth]/route';

// Server Component
export default async function Home() {
  // Get session on the server
  const session = await getServerSession(authOptions);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-100">
      <div className="text-center p-10 bg-white shadow-xl rounded-xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          Facebook Page Login Demo
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Current Status:{" "}
          <span className={`font-semibold ml-2 ${session ? 'text-green-600' : 'text-red-500'}`}>
            {session ? 'Signed In' : 'Signed Out'}
          </span>
        </p>

        {session ? (
          <div className="mt-6 space-y-4">
            <p className="text-gray-700">
              Welcome back, {session.user?.name || session.user?.email || 'User'}!
            </p>

            <Link 
              href="/dashboard"
              className="inline-block w-full text-center text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard (Protected)
            </Link>

            <Link 
              href="/logout"
              className="inline-block w-full text-center text-white bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Sign Out
            </Link>
          </div>
        ) : (
          <Link 
            href="/login"
            className="inline-block w-full text-center text-white bg-blue-600 px-6 py-3 rounded-xl hover:bg-blue-700 transition duration-300 shadow-lg"
          >
            Login with Facebook Page
          </Link>
        )}
      </div>
    </main>
  );
}
