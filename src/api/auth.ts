import { api } from "./client";
import type {
  EmailCode,
  LegalDocument,
  LegalKey,
  Signup,
  SignupConfig,
  Tokens,
} from "./types";

// 북키 계정과 같은 가입·로그인. 토큰이 없어야 하는 요청이라 모두 auth: false다.
const root = "/api/v1/auth";
export const auth = {
  login: (email: string, password: string) =>
    api<Tokens>(`${root}/login`, {
      method: "POST",
      auth: false,
      body: { email, password },
    }),
  signupConfig: () =>
    api<SignupConfig>(`${root}/signup-config`, { auth: false }),
  sendEmailCode: (email: string) =>
    api<EmailCode>(`${root}/email/code`, {
      method: "POST",
      auth: false,
      body: { email },
    }),
  // 확인만 하고 코드는 쓰지 않는다. 가입할 때 같은 코드를 다시 보낸다.
  verifyEmailCode: (email: string, code: string) =>
    api<void>(`${root}/email/code/verify`, {
      method: "POST",
      auth: false,
      body: { email, code },
    }),
  signup: (body: Signup) =>
    api<Tokens>(`${root}/signup`, { method: "POST", auth: false, body }),
  legal: (key: LegalKey) =>
    api<LegalDocument>(`/api/v1/public/legal/${key}`, { auth: false }),
};
