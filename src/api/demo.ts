import type { NovelSummary, NovelDetail, Chapter } from "./types";
const descriptions = [
  "자정에만 문을 여는 가게. 그곳에서는 잊어버린 꿈을 살 수 있다.",
  "오래된 카세트테이프 하나가 우리를 다시 불러 모았다.",
  "다음 역에 도착할 때마다 누군가 한 명씩 사라진다.",
  "잘못 도착한 편지에 답장을 했다. 답장은 어제의 날짜로 돌아왔다.",
];
export const demoStories: NovelSummary[] = [
  "달빛을 파는 가게",
  "우리의 여름은 아직",
  "종착역이 없는 열차",
  "받는 사람: 내일의 너",
].map((title, i) => ({
  id: i + 1,
  kind: "RELAY",
  title,
  description: descriptions[i],
  genre: ["판타지", "일상", "미스터리", "로맨스"][i],
  status: i === 1 ? "RECRUITING" : i === 3 ? "COMPLETED" : "ONGOING",
  ownerNickname: "달조각",
  memberCount: 4,
  memberLimit: 6,
  chapterCount: i === 1 ? 0 : 3,
  chapterLimit: 20,
  isPublic: true,
  mine: i === 0,
  myTurn: false,
  createdAt: "2026-10-12T09:00:00Z",
}));
export function demoDetail(id: number): NovelDetail {
  const novel = demoStories.find((s) => s.id === id) || demoStories[0];
  return {
    novel,
    members: ["달조각", "느린오후", "구름실", "밤산책"].map((nickname, i) => ({
      userId: i + 1,
      nickname,
      status: "ACTIVE",
      owner: i === 0,
      currentWriter: i === 2,
    })),
    applications: [],
    myMembership: "NONE",
    canApply: false,
    canWrite: false,
    canStart: false,
    canComplete: false,
    turnNumber: 4,
    currentWriterNickname: "구름실",
  };
}
export const demoChapters: Chapter[] = [
  {
    id: 1,
    novelId: 1,
    chapterNumber: 1,
    title: "자정을 지나서",
    authorNickname: "달조각",
    body: "그 가게를 발견한 건 마지막 버스를 놓친 밤이었다. 골목 끝의 작은 창문 너머로 은빛이 새어 나왔다.\n\n문 앞에는 손으로 쓴 팻말이 걸려 있었다. “달빛 한 병, 기억 하나.” 나는 주머니 속 오래된 사진을 만지작거리며 문을 밀었다.",
    createdAt: "2026-10-10T12:00:00Z",
  },
  {
    id: 2,
    novelId: 1,
    chapterNumber: 2,
    title: "잊어버린 꿈",
    authorNickname: "밤산책",
    body: "종소리 대신 파도 소리가 들렸다. 카운터 뒤의 노인은 나를 보지도 않고 말했다.\n\n“오래 기다렸어요. 당신이 맡겨둔 꿈이 아직 남아 있거든요.”\n\n유리병 안에서, 어린 시절의 내가 눈을 떴다.",
    createdAt: "2026-10-11T12:00:00Z",
  },
  {
    id: 3,
    novelId: 1,
    chapterNumber: 3,
    title: "유리병 속의 바다",
    authorNickname: "느린오후",
    body: "유리병을 귀에 가져다 대니 그 여름의 바다가 들렸다. 내가 잊은 건 꿈이 아니라 약속이었다.\n\n나는 다시는 돌아오지 않겠다고 말했던 곳으로 돌아갈 준비를 하고 있었다.",
    createdAt: "2026-10-12T12:00:00Z",
  },
];
