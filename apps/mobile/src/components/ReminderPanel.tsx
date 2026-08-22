import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { Bell, BellOff, Save } from "lucide-react";

const NOTIFICATION_ID = 1001;
const ENABLED_KEY = "babyflow-reminder-enabled";
const TIME_KEY = "babyflow-reminder-time";

export function ReminderPanel() {
  const native = Capacitor.isNativePlatform();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("20:00");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      Preferences.get({ key: ENABLED_KEY }),
      Preferences.get({ key: TIME_KEY }),
    ]).then(([savedEnabled, savedTime]) => {
      if (!active) return;
      setEnabled(savedEnabled.value === "true");
      if (savedTime.value) setTime(savedTime.value);
    });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      if (!native) {
        setMessage("Local reminders are available in the installed Android and iOS apps.");
        return;
      }

      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
      if (enabled) {
        let permission = await LocalNotifications.checkPermissions();
        if (permission.display === "prompt") {
          permission = await LocalNotifications.requestPermissions();
        }
        if (permission.display !== "granted") throw new Error("Notification permission was not granted.");

        const [hour, minute] = time.split(":").map(Number);
        await LocalNotifications.schedule({
          notifications: [{
            id: NOTIFICATION_ID,
            title: "BabyFlow reminder",
            body: "Open BabyFlow to record the latest event.",
            schedule: {
              on: { hour, minute },
              repeats: true,
            },
          }],
        });
      }

      await Preferences.set({ key: ENABLED_KEY, value: String(enabled) });
      await Preferences.set({ key: TIME_KEY, value: time });
      setMessage(enabled ? "Daily reminder scheduled." : "Daily reminder disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the reminder.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="screen reminders-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">On this device</p>
          <h1>Reminders</h1>
        </div>
        {enabled ? <Bell size={24} /> : <BellOff size={24} />}
      </div>

      <div className="settings-row reminder-toggle">
        <div>
          <strong>Daily reminder</strong>
          <span>{enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span />
        </label>
      </div>

      <label className="field-label">
        Reminder time
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={!enabled} />
      </label>

      {message && <p className="state-message" role="status">{message}</p>}

      <button className="primary-button" type="button" onClick={() => void save()} disabled={pending}>
        {pending ? <span className="spinner small" aria-label="Saving" /> : <Save size={18} />}
        <span>{pending ? "Saving" : "Save reminder"}</span>
      </button>
    </section>
  );
}
