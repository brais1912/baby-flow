import Link from "next/link";
import { LogoWithText } from "@/components/ui/Logo";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-fuchsia-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <LogoWithText />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Track every moment
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Log sleep, feedings, and diaper changes. See patterns, compare days, and understand your baby better.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
