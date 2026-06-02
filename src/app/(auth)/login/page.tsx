"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import { LogoWithText } from "@/components/ui/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-fuchsia-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <LogoWithText />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {sent ? (
            <div className="text-center">
              <p className="text-2xl mb-2">📬</p>
              <h2 className="font-semibold text-gray-900 mb-1">Check your email</h2>
              <p className="text-sm text-gray-500">
                We sent a magic link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500 mb-4">We&apos;ll send you a magic link</p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Sending..." : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
