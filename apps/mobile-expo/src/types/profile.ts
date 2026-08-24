export type BabyProfile = {
  name: string;
  dateOfBirth: string;
};

export type ProfileFieldError = "required" | "too_long" | "invalid" | "future";

export type ProfileValidationErrors = {
  name?: ProfileFieldError;
  dateOfBirth?: ProfileFieldError;
};
