import Link from "next/link";
import { LogoWithText } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <LogoWithText />
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-purple-600">
              Dashboard
            </Link>
            <Link href="/events/new" className="bg-purple-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              + Log event
            </Link>
            {user && (
              <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
