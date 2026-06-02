"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Suspense } from "react";
import { EventForm } from "@/components/events/EventForm";
import type { EventType } from "@/types/events";

function NewEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("newEvent");
  const locale = useLocale();
  const type = searchParams.get("type") as EventType | null;

  const titles: Record<EventType, string> = {
    sleep: t("sleep"),
    wake_up: t("wakeUp"),
    feeding: t("feeding"),
    diaper: t("diaper"),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {type ? titles[type] : t("default")}
        </h1>
        <p className="text-sm text-gray-500">{t("subtitle")}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <EventForm
          initialType={type ?? undefined}
          onSuccess={() => router.push(`/${locale}/dashboard`)}
        />
      </div>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventContent />
    </Suspense>
  );
}
