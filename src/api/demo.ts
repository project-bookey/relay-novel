import type {
  MyProfile,
  NovelSummary,
  NovelDetail,
  Chapter,
  ChapterNode,
  BranchBin,
  HomeFruitView,
  SunlightWallet,
} from "./types";

// 둘러보기에서 열매로 퍼뜨린 작품의 회차 하나에 붙는 가지 수(서버 기본값과 같다)
const DEMO_BRANCH_LIMIT = 3;

// 로그인 없이 "먼저 둘러보기"에서 쓰는 예시 작품. 서버에 저장되거나 발행되지 않는다.
// 네 가지 열매 모양과 모집·연재·완결 상태가 다 보이도록 일곱 편을 둔다(열매 탭·마이). 앞의 네 편은 모여 만들기(한 줄기),
// 뒤의 세 편은 열매로 퍼뜨려 가지가 갈라진 작품이다. 홈 열매는 뒤의 세 편에서 아직 이어 쓸 수 있는 회차다(demoHomeFruits).
interface DemoStorySeed {
  title: string;
  description: string;
  genre: string;
  // 대표 장르 뒤에 더 고른 장르
  moreGenres?: string[];
  status: NovelSummary["status"];
  chapterCount: number;
  memberCount: number;
  memberLimit: number;
  // 100개 이상이면 홈 열매 둘레에서 별이 반짝인다. E2E가 쓰는 앞 네 편은 그보다 적게 둔다.
  likeCount: number;
  mine?: boolean;
  mode?: NovelSummary["mode"];
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

    likeCount: 24,
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

    likeCount: 9,
  },
  {
    title: "종착역이 없는 열차",
    description: "다음 역에 도착할 때마다 누군가 한 명씩 사라진다.",
    genre: "미스터리",
    status: "ONGOING",
    chapterCount: 3,
    memberCount: 4,
    memberLimit: 6,

    likeCount: 57,
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

    likeCount: 88,
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

    likeCount: 41,
    mode: "OPEN",
  },
  {
    title: "고양이 도서관",
    description:
      "밤이 되면 고양이들이 사서가 되는 도서관. 오늘 빌려 간 책은 한 권도 돌아오지 않았다.",
    genre: "판타지",
    moreGenres: ["일상", "미스터리"],
    status: "ONGOING",
    chapterCount: 12,
    memberCount: 6,
    memberLimit: 8,

    likeCount: 1024,
    mode: "OPEN",
  },
  {
    title: "마지막 별빛 정거장",
    description: "우주 끝 정거장에서 마지막 셔틀을 기다리는 사람들의 이야기.",
    genre: "SF",
    moreGenres: ["드라마"],
    status: "ONGOING",
    chapterCount: 20,
    memberCount: 6,
    memberLimit: 6,

    likeCount: 311,
    mode: "OPEN",
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
  mode: seed.mode ?? "CIRCLE",
  // 열매로 퍼뜨리는 작품은 작가 수 제한이 없고, 회차마다 가지가 세 개까지 붙는다.
  branchLimit: seed.mode === "OPEN" ? DEMO_BRANCH_LIMIT : undefined,
  title: seed.title,
  description: seed.description,
  genre: seed.genre,
  genres: [seed.genre, ...(seed.moreGenres ?? [])],
  status: seed.status,
  ownerNickname: writerNames[0],
  memberCount: seed.memberCount,
  memberLimit: seed.mode === "OPEN" ? undefined : seed.memberLimit,
  chapterCount: seed.chapterCount,
  chapterLimit: 20,
  isPublic: true,
  mine: seed.mine ?? false,
  myTurn: false,
  createdAt: "2026-10-12T09:00:00Z",
  likeCount: seed.likeCount,
  liked: false,
  // 둘러보기에서도 책갈피를 보이고, 누르면 로그인으로 보낸다.
  favorited: false,
}));

function demoStory(id: number) {
  return demoStories.find((story) => story.id === id) ?? demoStories[0];
}

export function demoDetail(id: number): NovelDetail {
  const novel = demoStory(id);
  const names = writerNames.slice(0, novel.memberCount);
  // 차례대로 이어 쓰는 중인 작품에만 지금 쓰고 있는 작가가 있다.
  const hasTurn = novel.status === "ONGOING" && novel.mode === "CIRCLE";
  const currentWriterIndex = hasTurn ? 2 % names.length : -1;
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

// 둘러보기의 회차는 내가 쓴 것이 아니라 햇살로 이어 쓸 수 없다. 자리를 맡을 수 있는지는 열매로 퍼뜨린 작품만 따로 센다.
const demoReading = {
  viewCount: 0,
  canSelfContinue: false,
  selfContinueCost: 5,
  trunk: false,
  canClaim: false,
  slotsLeft: 0,
};

// 첫 작품은 실제로 읽어 볼 수 있게 이어지는 이야기를 직접 써 두었다.
const moonlightShopChapters: Chapter[] = [
  {
    id: 101,
    ...demoReading,
    novelId: 1,
    chapterNumber: 1,
    title: "자정을 지나서",
    authorNickname: "달조각",
    body: "그 가게를 발견한 건 마지막 버스를 놓친 밤이었다. 골목 끝의 작은 창문 너머로 은빛이 새어 나왔다.\n\n문 앞에는 손으로 쓴 팻말이 걸려 있었다. “달빛 한 병, 기억 하나.” 나는 주머니 속 오래된 사진을 만지작거리며 문을 밀었다.",
    createdAt: "2026-10-10T12:00:00Z",
  },
  {
    id: 102,
    ...demoReading,
    novelId: 1,
    chapterNumber: 2,
    title: "잊어버린 꿈",
    authorNickname: "밤산책",
    body: "종소리 대신 파도 소리가 들렸다. 카운터 뒤의 노인은 나를 보지도 않고 말했다.\n\n“오래 기다렸어요. 당신이 맡겨둔 꿈이 아직 남아 있거든요.”\n\n유리병 안에서, 어린 시절의 내가 눈을 떴다.",
    createdAt: "2026-10-11T12:00:00Z",
  },
  {
    id: 103,
    ...demoReading,
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

// 열매로 퍼뜨린 작품의 가지 모양. i번째 회차가 몇 번째 회차에서 뻗었는지(-1은 뿌리).
// 뿌리를 둘이 이어 쓰고, 그 가지들이 다시 갈라지며 깊어진다.
const demoBranchParents = [
  -1, 0, 0, 1, 1, 2, 3, 3, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 13, 14,
];

function chainChapters(chapters: Chapter[]): Chapter[] {
  return chapters.map((chapter, index) => ({
    ...chapter,
    parentChapterId: index === 0 ? undefined : chapters[index - 1].id,
  }));
}

// 뿌리에서 먼저 쓴 가지를 따라 올라간 마디가 첫 작가의 줄기다. 줄기가 아닌 가지만 가지 자리를 차지한다.
function branchChapters(chapters: Chapter[], novel: NovelSummary): Chapter[] {
  const linked: Chapter[] = [];
  chapters.forEach((chapter, index) => {
    const parentIndex = demoBranchParents[index % demoBranchParents.length];
    const parent = parentIndex >= 0 ? linked[parentIndex] : undefined;
    linked.push({
      ...chapter,
      parentChapterId: parent?.id,
      chapterNumber: parent ? parent.chapterNumber + 1 : 1,
      trunk:
        !parent ||
        (parent.trunk &&
          !linked.some((other) => other.parentChapterId === parent.id)),
    });
  });
  const growing = novel.status === "ONGOING";
  return linked.map((chapter) => {
    const branches = linked.filter(
      (other) => other.parentChapterId === chapter.id && !other.trunk,
    ).length;
    const slotsLeft = Math.max(0, DEMO_BRANCH_LIMIT - branches);
    const canGrow = growing && chapter.chapterNumber < novel.chapterLimit;
    return {
      ...chapter,
      authorNickname: authorOf(chapter, novel),
      slotsLeft,
      canClaim: canGrow && slotsLeft > 0,
    };
  });
}

// 줄기는 만든 사람이 쓰고, 가지는 다른 작가들이 쓴다(만든 사람은 남의 회차에 가지를 뻗지 않는다).
function authorOf(chapter: Chapter, novel: NovelSummary) {
  if (chapter.trunk) return novel.ownerNickname;
  if (chapter.authorNickname !== novel.ownerNickname)
    return chapter.authorNickname;
  return writerNames[1];
}

// 둘러보기 작품의 회차. 작품의 회차 수만큼 만들어 목차와 읽기 화면이 서로 맞게 한다.
export function demoChaptersOf(novelId: number): Chapter[] {
  const novel = demoStory(novelId);
  const written = writtenDemoChapters(novelId);
  return novel.mode === "OPEN"
    ? branchChapters(written, novel)
    : chainChapters(written);
}

// 회차 나무의 마디. 목차와 이야기 나무가 같은 마디를 쓴다.
export function demoChapterTreeOf(novelId: number): ChapterNode[] {
  return demoChaptersOf(novelId).map((chapter) => ({
    id: chapter.id,
    parentChapterId: chapter.parentChapterId,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    authorNickname: chapter.authorNickname,
    excerpt: chapter.body.slice(0, 140),
    createdAt: chapter.createdAt,
    trunk: chapter.trunk,
  }));
}

// 둘러보기 홈의 열매 — 열매로 퍼뜨린 작품에서 아직 이어 쓸 수 있는 회차. 최근에 쓴 회차부터 작품을 돌아가며 놓는다.
// 새로고침하면 홈이 이 목록을 섞어 다시 떨어뜨린다.
export function demoHomeFruits(): HomeFruitView[] {
  const byNovel = demoStories
    .filter((story) => story.mode === "OPEN" && story.status === "ONGOING")
    .map((story) =>
      demoChaptersOf(story.id)
        .filter((chapter) => chapter.canClaim)
        .sort((first, second) => second.id - first.id)
        .map((chapter) => fruitOf(story, chapter)),
    );
  const fruits: HomeFruitView[] = [];
  for (let round = 0; byNovel.some((list) => round < list.length); round++)
    byNovel.forEach((list) => {
      if (round < list.length) fruits.push(list[round]);
    });
  return fruits;
}

function fruitOf(novel: NovelSummary, chapter: Chapter): HomeFruitView {
  return {
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    chapterTitle: chapter.title,
    excerpt: chapter.body.slice(0, 140),
    authorNickname: chapter.authorNickname,
    createdAt: chapter.createdAt,
    slotsLeft: chapter.slotsLeft,
    novel,
  };
}

function writtenDemoChapters(novelId: number): Chapter[] {
  if (novelId === 1) return moonlightShopChapters;
  const novel = demoStory(novelId);
  const names = writerNames.slice(0, novel.memberCount);
  return Array.from({ length: novel.chapterCount }, (_, index) => {
    const chapterNumber = index + 1;
    const day = String(1 + (index % 28)).padStart(2, "0");
    return {
      id: novelId * 100 + chapterNumber,
      ...demoReading,
      novelId,
      chapterNumber,
      title: chapterTitles[index % chapterTitles.length],
      authorNickname: names[index % names.length],
      body: `${novel.description}\n\n${chapterScenes[index % chapterScenes.length]}`,
      createdAt: `2026-09-${day}T12:00:00Z`,
    };
  });
}

export function demoChapter(novelId: number, chapterId: number) {
  const chapter = demoChaptersOf(novelId).find(
    (candidate) => candidate.id === chapterId,
  );
  if (!chapter) throw new Error("이 장을 찾지 못했어요.");
  return chapter;
}

// 둘러보기용 장르. 실제 목록은 서버가 준다.
// 서버의 장르 목록(NovelGenres.ALL)과 같은 순서
export const demoGenres = [
  "판타지",
  "현대판타지",
  "로맨스",
  "로맨스판타지",
  "무협",
  "미스터리",
  "스릴러",
  "공포",
  "SF",
  "일상",
  "드라마",
  "역사",
  "코미디",
];

const DAY_MS = 24 * 60 * 60 * 1000;

// 둘러보기의 나뭇가지 수거함. 열매로 퍼뜨린 작품에서 조회가 모자라 숨겨진 가지 둘이고, 지울 날은 지금부터 센다.
export function demoBranchBin(now = new Date()): BranchBin {
  const prunedAgo = (days: number) =>
    new Date(now.getTime() - days * DAY_MS).toISOString();
  const purgeIn = (days: number) =>
    new Date(now.getTime() + days * DAY_MS).toISOString();
  return {
    restoreCost: 3,
    branches: [
      {
        chapterId: 9001,
        novelId: 5,
        novelTitle: demoStory(5).title,
        chapterNumber: 4,
        title: "젖은 편지의 주소",
        excerpt: "번진 잉크 사이로 겨우 읽히는 주소는 이 동네에 없는 번지였다.",
        viewCount: 23,
        prunedAt: prunedAgo(2),
        purgeAt: purgeIn(5),
      },
      {
        chapterId: 9002,
        novelId: 7,
        novelTitle: demoStory(7).title,
        chapterNumber: 9,
        title: "멈춘 시계탑",
        excerpt:
          "정거장 시계는 열두 시 일 분 전에서 멈춰 있었고, 아무도 그걸 고치지 않았다.",
        viewCount: 41,
        prunedAt: prunedAgo(6),
        purgeAt: purgeIn(1),
      },
    ],
  };
}

// 둘러보기에서는 햇살을 채우거나 쓸 수 없어 잔액이 0이다. 값과 상품은 서버 설정과 같게 둔다.
export const demoSunlight: SunlightWallet = {
  balance: 0,
  restoreCost: 3,
  selfBranchCost: 5,
  products: [
    { productId: "relaynovel.sunlight.10", quantity: 10, amountKrw: 1100 },
    { productId: "relaynovel.sunlight.30", quantity: 30, amountKrw: 3300 },
    { productId: "relaynovel.sunlight.100", quantity: 100, amountKrw: 9900 },
  ],
};

// 둘러보기의 내 정보. 예시 작품 가운데 내 작품을 만든 작가로 둔다.
export const demoProfile: MyProfile = {
  id: 0,
  handle: "moonpiece",
  nickname: writerNames[0],
};
