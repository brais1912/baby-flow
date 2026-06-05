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
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/80 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/dashboard`}>
              <LogoWithText />
            </Link>
            <Link
              href={`/${locale}/insights`}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-purple-600 bg-gray-100 hover:bg-purple-50 px-3 py-1.5 rounded-full transition-colors"
            >
              <span>📊</span>
              {t("insights")}
            </Link>
          </div>
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
