"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "es";

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace(`/${locale}/login`);
    });
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
      aria-label="Sign out"
    >
      {isPending ? "..." : "↩"}
    </button>
  );
}
