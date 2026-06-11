import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { LogoWithText } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default async function Home() {
  const t = await getTranslations("home");
  const locale = await getLocale();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-fuchsia-50 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <LogoWithText />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">{t("tagline")}</h1>
        <p className="text-lg text-gray-500 mb-8">{t("description")}</p>
        <Link
          href={`/${locale}/login`}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 active:bg-purple-800 active:scale-95 transition-all duration-150 inline-block"
        >
          {t("getStarted")}
        </Link>
      </div>
    </main>
  );
}
