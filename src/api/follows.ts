import { api } from "./client";
import type { FollowUser, Page } from "./types";

// 북키의 팔로우. 모여 만들기에서 함께 쓸 작가를 고를 때 쓴다.
export const follows = {
  following: (page = 0) =>
    api<Page<FollowUser>>("/api/v1/follows/following", {
      query: { page, size: 50 },
    }),
};
