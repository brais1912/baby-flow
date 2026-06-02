"use client";

import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";

export default function NewEventPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log event</h1>
        <p className="text-sm text-gray-500">Record what&apos;s happening right now</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <EventForm onSuccess={() => router.push("/dashboard")} />
      </div>
    </div>
  );
}
