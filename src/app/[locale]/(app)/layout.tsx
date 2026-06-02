import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { LogoWithText } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const supabase = await createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/${locale}/dashboard`}><LogoWithText /></Link>
          <nav className="flex items-center gap-2">
<Link href={`/${locale}/events/new?type=sleep`} className="bg-purple-100 text-purple-700 text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-purple-200 transition-colors">
              😴 {t("sleep")}
            </Link>
            <Link href={`/${locale}/events/new?type=wake_up`} className="bg-orange-100 text-orange-700 text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-orange-200 transition-colors">
              🌅 {t("wakeUp")}
            </Link>
            <Link href={`/${locale}/events/new?type=feeding`} className="bg-blue-100 text-blue-700 text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 transition-colors">
              🍼 {t("feeding")}
            </Link>
            <Link href={`/${locale}/events/new?type=diaper`} className="bg-amber-100 text-amber-700 text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-amber-200 transition-colors">
              👶 {t("diaper")}
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
