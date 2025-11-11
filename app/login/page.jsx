import { LoginButton } from "../components/LoginButton";

// This page serves as the custom sign-in route (/login) defined in route.js.
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <LoginButton />
    </main>
  );
}