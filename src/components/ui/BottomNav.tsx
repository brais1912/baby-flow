"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useTransition, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/actions/events";
import { parseInvalidSleepSequenceError } from "@/types/events";

const ACTIONS = [
  { type: "sleep",   emoji: "😴", color: "text-purple-600", bg: "bg-purple-50", activeBg: "bg-purple-100 ring-2 ring-purple-300", flash: "bg-purple-500" },
  { type: "wake_up", emoji: "🌅", color: "text-orange-500", bg: "bg-orange-50", activeBg: "bg-orange-100 ring-2 ring-orange-300", flash: "bg-orange-400" },
  { type: "feeding", emoji: "🍼", color: "text-blue-500",   bg: "bg-blue-50",   activeBg: "bg-blue-100 ring-2 ring-blue-300",   flash: "bg-blue-500" },
  { type: "diaper",  emoji: "👶", color: "text-amber-500",  bg: "bg-amber-50",  activeBg: "bg-amber-100 ring-2 ring-amber-300", flash: "bg-amber-400" },
] as const;

type EventType = (typeof ACTIONS)[number]["type"];

// QuickLog events carry no enum/numeric details — only the notes marker so
// they are identifiable in history without polluting fields with fake values.
const QUICKLOG_DEFAULTS: Record<EventType, Parameters<typeof createEvent>[0]> = {
  sleep:   { type: "sleep",   occurredAt: new Date(), notes: "QuickLog" },
  wake_up: { type: "wake_up", occurredAt: new Date(), notes: "QuickLog" },
  feeding: { type: "feeding", occurredAt: new Date(), notes: "QuickLog" },
  diaper:  { type: "diaper",  occurredAt: new Date(), notes: "QuickLog" },
};

const NAV_MODE_KEY = "babyflow-nav-mode";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function getSnapshot() {
  return (localStorage.getItem(NAV_MODE_KEY) as "quicklog" | "detailed") ?? "quicklog";
}
function getServerSnapshot(): "quicklog" {
  return "quicklog";
}

function useQuicklogMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = getSnapshot() === "quicklog" ? "detailed" : "quicklog";
    localStorage.setItem(NAV_MODE_KEY, next);
    // Force re-render since storage event doesn't fire in the same tab
    window.dispatchEvent(new Event("storage"));
  }, []);

  return { mode, toggle };
}

function ModeToggle({ mode, onToggle }: { mode: "quicklog" | "detailed"; onToggle: () => void }) {
  const tQ = useTranslations("quicklog");
  const isQuicklog = mode === "quicklog";

  return (
    <div className="flex items-center justify-center gap-1 px-3 pb-0.5">
      <span className={`text-[10px] font-semibold transition-colors ${!isQuicklog ? "text-gray-700" : "text-gray-300"}`}>
        {tQ("detailedName")}
      </span>

      <button
        type="button"
        onClick={onToggle}
        aria-label={`Switch to ${isQuicklog ? tQ("detailedName") : tQ("modeName")} mode`}
        className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        style={{
          background: isQuicklog
            ? "linear-gradient(to right, #9333ea, #d946ef)"
            : "#e5e7eb",
        }}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 flex items-center justify-center text-[10px] leading-none ${
            isQuicklog ? "left-[22px]" : "left-0.5"
          }`}
        >
          {isQuicklog ? "⚡" : "📝"}
        </span>
      </button>

      <span className={`text-[10px] font-semibold transition-colors ${isQuicklog ? "text-purple-600" : "text-gray-300"}`}>
        {tQ("modeName")}
      </span>
    </div>
  );
}

function QuickLogButton({
  type, emoji, color, bg, flash, label,
}: {
  type: EventType; emoji: string; color: string; bg: string; flash: string; label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const [errorLabel, setErrorLabel] = useState<string | null>(null);
  const tQ = useTranslations("quicklog");
  const router = useRouter();

  function handleTap() {
    if (isPending || justSaved || errorLabel) return;
    const defaults = { ...QUICKLOG_DEFAULTS[type], occurredAt: new Date() };
    startTransition(async () => {
      try {
        await createEvent(defaults);
      } catch (err) {
        const sequenceErrorType = err instanceof Error ? parseInvalidSleepSequenceError(err.message) : null;
        setErrorLabel(
          sequenceErrorType
            ? tQ(sequenceErrorType === "sleep" ? "alreadyAsleep" : "alreadyAwake")
            : tQ("genericError")
        );
        setTimeout(() => setErrorLabel(null), 1800);
        return;
      }
      router.refresh();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    });
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={isPending}
      className={`relative flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-2xl transition-all active:scale-90 disabled:opacity-70 ${bg} ${color}`}
    >
      {/* spinning ring while pending */}
      {isPending && (
        <span className="absolute inset-0 rounded-2xl border-2 border-current opacity-30 animate-ping" />
      )}

      {/* success flash overlay */}
      {justSaved && (
        <span className={`absolute inset-0 rounded-2xl ${flash} opacity-20 animate-pulse`} />
      )}

      {/* blocked flash overlay */}
      {errorLabel && (
        <span className="absolute inset-0 rounded-2xl bg-red-500 opacity-20" />
      )}

      <span className={`text-2xl leading-none transition-transform ${isPending ? "scale-75 opacity-60" : ""}`}>
        {errorLabel ? "🚫" : justSaved ? "✓" : emoji}
      </span>
      <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80 text-center leading-tight">
        {errorLabel ?? (justSaved ? tQ("savedFeedback") : label)}
      </span>
    </button>
  );
}

export function BottomNav() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { mode, toggle } = useQuicklogMode();

  const labels: Record<string, string> = {
    sleep: t("sleep"),
    wake_up: t("wakeUp"),
    feeding: t("feeding"),
    diaper: t("diaper"),
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-pb">
      {/* Mode toggle bar */}
      <ModeToggle mode={mode} onToggle={toggle} />

      {/* Event buttons */}
      <div className="max-w-2xl mx-auto px-3 h-16 flex items-center gap-1">
        {ACTIONS.map(({ type, emoji, color, bg, activeBg, flash }) => {
          const label = labels[type];

          if (mode === "quicklog") {
            return (
              <QuickLogButton
                key={type}
                type={type}
                emoji={emoji}
                color={color}
                bg={bg}
                flash={flash}
                label={label}
              />
            );
          }

          // Detailed mode — navigate to form
          const href = `/${locale}/events/new?type=${type}`;
          const isActive =
            pathname.includes("/events/new") &&
            (pathname.includes(`type=${type}`) ||
              (typeof window !== "undefined" && window.location.search.includes(`type=${type}`)));
          return (
            <Link
              key={type}
              href={href}
              className={`flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-2xl transition-all active:scale-95 ${
                isActive ? activeBg : bg
              } ${color}`}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
