import { ApiError } from "../../api/transport";

// 가입 입력 규칙. 북키 앱(login.tsx·authFields.tsx)과 서버 검증(AuthDtos)에 맞춘다.
export const EMAIL_MAX = 255;
export const NICKNAME_MAX = 50;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const CODE_LENGTH = 6;

export function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value) && value.length <= EMAIL_MAX;
}

export function isCode(value: string) {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value);
}

export type SignupField = "email" | "code" | "nickname" | "password";

// 서버 오류를 해당 칸 아래에 보여 준다. 문구는 서버가 보낸 것을 그대로 쓴다.
const fieldOfCode: Record<string, SignupField> = {
  EMAIL_ALREADY_EXISTS: "email",
  EMAIL_REJOIN_BLOCKED: "email",
  NICKNAME_ALREADY_EXISTS: "nickname",
  EMAIL_CODE_INVALID: "code",
  EMAIL_CODE_EXPIRED: "code",
};

export function fieldOfError(error: unknown): SignupField | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return fieldOfCode[error.code];
}

// 남은 시간을 "2:05"처럼 쓴다.
export function formatRemaining(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}
