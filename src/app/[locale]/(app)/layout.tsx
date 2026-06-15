import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LogoWithText } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { BottomNav } from "@/components/ui/BottomNav";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const supabase = await createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9ff]">
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/80 safe-area-pt">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/${locale}/dashboard`}
              className="flex-shrink-0 transition-all duration-150 active:scale-95 active:opacity-60"
            >
              <LogoWithText />
            </Link>
            <Link
              href={`/${locale}/insights`}
              aria-label={t("insights")}
              className="flex items-center justify-center w-8 h-8 text-base text-gray-500 hover:text-purple-600 bg-gray-100 hover:bg-purple-50 rounded-full transition-all duration-150 active:scale-90 active:bg-purple-100 flex-shrink-0"
            >
              📊
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-[calc(env(safe-area-inset-top)+4.75rem)] pb-28">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
