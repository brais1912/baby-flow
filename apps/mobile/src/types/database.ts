import type {
  DiaperType,
  EventRow,
  EventType,
  FeedingType,
  SleepCondition,
  SleepMethod,
} from "./events";

export type EventInsertRow = {
  id?: string;
  user_id: string;
  type: EventType;
  occurred_at: string;
  notes?: string | null;
  sleep_method?: SleepMethod | null;
  sleep_condition?: SleepCondition | null;
  sleep_room_temperature?: number | null;
  feeding_type?: FeedingType | null;
  feeding_amount_ml?: number | null;
  feeding_duration_minutes?: number | null;
  diaper_type?: DiaperType | null;
  created_at?: string;
  updated_at?: string;
};

export type EventUpdateRow = Partial<Omit<EventInsertRow, "id" | "user_id">>;

export type UserSettingsRow = {
  user_id: string;
  day_window_start_minutes: number;
  baby_name: string | null;
  baby_date_of_birth: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: EventInsertRow;
        Update: EventUpdateRow;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: {
          user_id: string;
          day_window_start_minutes?: number;
          baby_name?: string | null;
          baby_date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_window_start_minutes?: number;
          baby_name?: string | null;
          baby_date_of_birth?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      event_type: EventType;
      sleep_method: SleepMethod;
      sleep_condition: SleepCondition;
      feeding_type: FeedingType;
      diaper_type: DiaperType;
    };
    CompositeTypes: Record<never, never>;
  };
};
