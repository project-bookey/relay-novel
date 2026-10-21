import { api } from "./client";
import type { MyProfile } from "./types";

// 북키 계정의 내 정보. 마이 맨 위의 닉네임·아이디에 쓴다.
export const me = {
  profile: () => api<MyProfile>("/api/v1/me"),
};
