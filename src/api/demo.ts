import type { NovelSummary, NovelDetail, Chapter } from "./types";

// 로그인 없이 "먼저 둘러보기"에서 쓰는 예시 작품. 서버에 저장되거나 발행되지 않는다.
// 홈의 열매 자리가 모두 차고, 네 가지 열매 모양과 모집·연재·완결 상태가 다 보이도록 일곱 편을 둔다.
interface DemoStorySeed {
  title: string;
  description: string;
  genre: string;
  status: NovelSummary["status"];
  chapterCount: number;
  memberCount: number;
  memberLimit: number;
  mine?: boolean;
}

const seeds: DemoStorySeed[] = [
  {
    title: "달빛을 파는 가게",
    description:
      "자정에만 문을 여는 가게. 그곳에서는 잊어버린 꿈을 살 수 있다.",
    genre: "판타지",
    status: "ONGOING",
    chapterCount: 3,
    memberCount: 4,
    memberLimit: 6,
    mine: true,
  },
  {
    title: "우리의 여름은 아직",
    description: "오래된 카세트테이프 하나가 우리를 다시 불러 모았다.",
    genre: "일상",
    status: "RECRUITING",
    chapterCount: 0,
    memberCount: 4,
    memberLimit: 6,
  },
  {
    title: "종착역이 없는 열차",
    description: "다음 역에 도착할 때마다 누군가 한 명씩 사라진다.",
    genre: "미스터리",
    status: "ONGOING",
    chapterCount: 3,
    memberCount: 4,
    memberLimit: 6,
  },
  {
    title: "받는 사람: 내일의 너",
    description:
      "잘못 도착한 편지에 답장을 했다. 답장은 어제의 날짜로 돌아왔다.",
    genre: "로맨스",
    status: "COMPLETED",
    chapterCount: 3,
    memberCount: 4,
    memberLimit: 6,
  },
  {
    title: "비 오는 날의 우체부",
    description:
      "비가 오는 날에만 배달되는 편지가 있다. 받는 사람 칸은 늘 비어 있다.",
    genre: "일상",
    status: "ONGOING",
    chapterCount: 7,
    memberCount: 5,
    memberLimit: 6,
  },
  {
    title: "고양이 도서관",
    description:
      "밤이 되면 고양이들이 사서가 되는 도서관. 오늘 빌려 간 책은 한 권도 돌아오지 않았다.",
    genre: "판타지",
    status: "ONGOING",
    chapterCount: 12,
    memberCount: 6,
    memberLimit: 8,
  },
  {
    title: "마지막 별빛 정거장",
    description: "우주 끝 정거장에서 마지막 셔틀을 기다리는 사람들의 이야기.",
    genre: "SF",
    status: "COMPLETED",
    chapterCount: 20,
    memberCount: 6,
    memberLimit: 6,
  },
];

const writerNames = [
  "달조각",
  "느린오후",
  "구름실",
  "밤산책",
  "새벽편지",
  "파란우산",
  "모래시계",
  "종이배",
];

export const demoStories: NovelSummary[] = seeds.map((seed, index) => ({
  id: index + 1,
  kind: "RELAY",
  title: seed.title,
  description: seed.description,
  genre: seed.genre,
  status: seed.status,
  ownerNickname: writerNames[0],
  memberCount: seed.memberCount,
  memberLimit: seed.memberLimit,
  chapterCount: seed.chapterCount,
  chapterLimit: 20,
  isPublic: true,
  mine: seed.mine ?? false,
  myTurn: false,
  createdAt: "2026-10-12T09:00:00Z",
}));

function demoStory(id: number) {
  return demoStories.find((story) => story.id === id) ?? demoStories[0];
}

export function demoDetail(id: number): NovelDetail {
  const novel = demoStory(id);
  const names = writerNames.slice(0, novel.memberCount);
  // 이어 쓰는 중인 작품에만 지금 쓰고 있는 작가가 있다.
  const currentWriterIndex = novel.status === "ONGOING" ? 2 % names.length : -1;
  return {
    novel,
    members: names.map((nickname, index) => ({
      userId: index + 1,
      nickname,
      status: "ACTIVE",
      owner: index === 0,
      currentWriter: index === currentWriterIndex,
    })),
    applications: [],
    myMembership: "NONE",
    canApply: false,
    canWrite: false,
    canStart: false,
    canComplete: false,
    turnNumber: novel.chapterCount + 1,
    currentWriterNickname: names[currentWriterIndex],
  };
}

// 첫 작품은 실제로 읽어 볼 수 있게 이어지는 이야기를 직접 써 두었다.
const moonlightShopChapters: Chapter[] = [
  {
    id: 101,
    novelId: 1,
    chapterNumber: 1,
    title: "자정을 지나서",
    authorNickname: "달조각",
    body: "그 가게를 발견한 건 마지막 버스를 놓친 밤이었다. 골목 끝의 작은 창문 너머로 은빛이 새어 나왔다.\n\n문 앞에는 손으로 쓴 팻말이 걸려 있었다. “달빛 한 병, 기억 하나.” 나는 주머니 속 오래된 사진을 만지작거리며 문을 밀었다.",
    createdAt: "2026-10-10T12:00:00Z",
  },
  {
    id: 102,
    novelId: 1,
    chapterNumber: 2,
    title: "잊어버린 꿈",
    authorNickname: "밤산책",
    body: "종소리 대신 파도 소리가 들렸다. 카운터 뒤의 노인은 나를 보지도 않고 말했다.\n\n“오래 기다렸어요. 당신이 맡겨둔 꿈이 아직 남아 있거든요.”\n\n유리병 안에서, 어린 시절의 내가 눈을 떴다.",
    createdAt: "2026-10-11T12:00:00Z",
  },
  {
    id: 103,
    novelId: 1,
    chapterNumber: 3,
    title: "유리병 속의 바다",
    authorNickname: "느린오후",
    body: "유리병을 귀에 가져다 대니 그 여름의 바다가 들렸다. 내가 잊은 건 꿈이 아니라 약속이었다.\n\n나는 다시는 돌아오지 않겠다고 말했던 곳으로 돌아갈 준비를 하고 있었다.",
    createdAt: "2026-10-12T12:00:00Z",
  },
];

const chapterTitles = [
  "첫 문장",
  "낯선 손님",
  "닫힌 문",
  "엇갈린 약속",
  "돌아온 편지",
  "작은 기적",
  "밤의 끝",
  "두 번째 지도",
  "잃어버린 열쇠",
  "비밀의 방",
  "멀리서 온 소식",
  "같은 꿈",
  "흔들리는 다리",
  "오래된 노래",
  "빈 의자",
  "마지막 기차",
  "숨겨 둔 이름",
  "새벽의 약속",
  "다시 만난 날",
  "이야기의 끝",
];

const chapterScenes = [
  "누군가 먼저 문을 두드렸다. 대답하기도 전에, 낯익은 목소리가 이름을 불렀다.",
  "창밖의 풍경이 조금씩 달라지고 있었다. 어제와 같은 길인데, 어제와 같은 곳은 아니었다.",
  "주머니 속 쪽지에는 내 글씨로 모르는 문장이 적혀 있었다.",
  "그날 밤 우리는 처음으로 서로의 비밀을 하나씩 꺼내 놓았다.",
  "멀리서 들려오던 소리가 멈췄다. 그리고 아주 가까운 곳에서 다시 시작됐다.",
];

// 둘러보기 작품의 회차. 작품의 회차 수만큼 만들어 목차와 읽기 화면이 서로 맞게 한다.
export function demoChaptersOf(novelId: number): Chapter[] {
  if (novelId === 1) return moonlightShopChapters;
  const novel = demoStory(novelId);
  const names = writerNames.slice(0, novel.memberCount);
  return Array.from({ length: novel.chapterCount }, (_, index) => {
    const chapterNumber = index + 1;
    const day = String(1 + (index % 28)).padStart(2, "0");
    return {
      id: novelId * 100 + chapterNumber,
      novelId,
      chapterNumber,
      title: chapterTitles[index % chapterTitles.length],
      authorNickname: names[index % names.length],
      body: `${novel.description}\n\n${chapterScenes[index % chapterScenes.length]}`,
      createdAt: `2026-09-${day}T12:00:00Z`,
    };
  });
}

export function demoChapter(novelId: number, chapterNumber: number) {
  const chapter = demoChaptersOf(novelId).find(
    (candidate) => candidate.chapterNumber === chapterNumber,
  );
  if (!chapter) throw new Error("이 장을 찾지 못했어요.");
  return chapter;
}
