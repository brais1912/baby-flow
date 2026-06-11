import { LogoWithText } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";

export default function LocaleLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50">
      <LogoWithText />
      <Spinner className="w-6 h-6 text-purple-500" />
    </main>
  );
}
