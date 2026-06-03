import Link from "next/link";
import { getLocale } from "next-intl/server";
import { LogoWithText } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { BottomNav } from "@/components/ui/BottomNav";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9ff]">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/80 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/${locale}/dashboard`}>
            <LogoWithText />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-28">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
