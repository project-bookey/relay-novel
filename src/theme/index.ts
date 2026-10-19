export type Scheme = "light" | "dark";

const lightColors = {
  background: "#FFFFFF",
  paper: "#FFFFFF",
  ink: "#30362F",
  // 잉크색(ink) 바탕 위의 글자·아이콘. 버튼처럼 ink를 칠한 곳에 쓴다.
  onInk: "#FFFFFF",
  muted: "#868A80",
  line: "#E7E7DD",
  green: "#526552",
  mint: "#ADCBBE",
  errorSurface: "#FAEBE6",
  errorInk: "#925744",
  // 이야기 나무
  leaf: "#9DBD8F",
  leafLight: "#C8DDBA",
  leafDeep: "#6F9668",
  bark: "#A0805F",
  ground: "#E8E3CF",
  bud: "#F6E3A1",
  // 좋아요를 많이 받은 인기 열매 둘레에서 반짝이는 별. 꽃봉오리(bud)보다 짙은 따뜻한 노랑
  sparkle: "#F5C542",
  // 홈 열매의 그림자. 나무 그림의 흙빛과 어울리는 따뜻한 짙은 색
  fruitShadow: "#5B5142",
  fruitShadowOpacity: 0.3,
  // 열매 말풍선 카드의 그림자. 잉크색(ink)을 옅게 깐다.
  cardShadow: "rgba(48, 54, 47, 0.16)",
  // 아래에서 올라오는 창 뒤를 덮는 막
  scrim: "rgba(48, 54, 47, 0.35)",
  // 홈 열매 밭에 흩뿌린 풀과 꽃(사용자가 고른 시안 G에서 풀·꽃만 남긴 것).
  // 흰 바탕에서도 흰 꽃이 보이도록 꽃잎에 옅은 테두리를 두른다.
  grassBlade: "#A5C497",
  grassBladeDeep: "#8BB07E",
  flowerPetal: "#FFFFFF",
  flowerPetalWarm: "#F6E3A1",
  flowerPetalEdge: "#C9D2BD",
  flowerCore: "#F5C542",
  flowerCoreWarm: "#E9A23B",
  // 하단 아이콘과 씨앗주머니·새로고침 새싹의 선
  iconInk: "#000000",
  // 홈 위쪽 나무의 굵은 가지. 사용자가 그려 준 진한 갈색
  bough: "#613D30",
  // 홈 나무 위 캐릭터(사용자 그림): 몸 색, 눈 선, 다리, 신나게 뛸 때 머리 옆에 뜨는 빗금 색
  castCircle: "#FEF2D3",
  castTriangle: "#FEE49A",
  castSquare: "#B8D7FE",
  castInk: "#191919",
  castLeg: "#191919",
  castCircleAccent: "#FFA902",
  castTriangleAccent: "#4E9A51",
  castSquareAccent: "#FC4447",
  // 풀밭에서 노는 캐릭터: 옆모습일 때 먼 다리, 등 쪽 어두운 면, 흰 바탕에 묻히지 않게 두른 동그라미 테두리
  castLegFar: "#5C5C5C",
  castCircleShade: "#F2E3BB",
  castTriangleShade: "#F4D47F",
  castSquareShade: "#9DC3F2",
  castCircleEdge: "#E6D6A8",
  // 아래쪽 유리 바. 시스템 유리가 없는 곳에서 흉내 낸 유리의 색과 빛
  glassTint: "rgba(246, 246, 248, 0.55)",
  glassSolid: "rgba(246, 246, 248, 0.92)",
  glassEdge: "rgba(255, 255, 255, 0.7)",
  glassShadow: [
    "0 10px 28px rgba(0, 0, 0, 0.08)",
    "0 1px 3px rgba(0, 0, 0, 0.06)",
    "inset 0 1px 1px rgba(255, 255, 255, 0.95)",
    "inset 0 -1px 2px rgba(255, 255, 255, 0.5)",
  ].join(", "),
  // 지금 있는 곳 아래에 깔리는 유리 방울
  lensFill: "rgba(255, 255, 255, 0.75)",
  lensEdge: "rgba(255, 255, 255, 0.95)",
  lensShadow: [
    "0 3px 10px rgba(0, 0, 0, 0.10)",
    "0 0 0 0.5px rgba(0, 0, 0, 0.05)",
    "inset 0 1px 2px rgba(255, 255, 255, 1)",
    "inset 0 -2px 4px rgba(0, 0, 0, 0.05)",
  ].join(", "),
};

export type Palette = typeof lightColors;

// 어두운 모드는 "밤의 들판"이다. 짙은 회색 바탕에 열매·나무·캐릭터 색은 그대로 두고,
// 글자·선은 밝게 뒤집는다. 그림자는 검게 깔고, 바탕은 그 검은 그림자가 보일 만큼 회색으로 띄운다.
const darkColors: Palette = {
  ...lightColors,
  background: "#2E3033",
  // 말풍선·카드가 바탕에서 떠 보이도록 바탕보다 한 단계 밝게 둔다.
  paper: "#3C3F43",
  ink: "#E6E8E1",
  onInk: "#2E3033",
  muted: "#8E948B",
  line: "#4A4D52",
  green: "#9FC39C",
  mint: "#5F7F70",
  errorSurface: "#3A2622",
  errorInk: "#F0B7A4",
  ground: "#3A3E37",
  fruitShadow: "#000000",
  // 바탕이 어두운 편이라 진하게 깔아야 열매가 바닥에 붙어 보인다.
  fruitShadowOpacity: 0.7,
  cardShadow: "rgba(0, 0, 0, 0.5)",
  scrim: "rgba(0, 0, 0, 0.55)",
  // 어두운 바탕 위의 풀과 꽃은 한 톤 가라앉힌다.
  grassBlade: "#5E7A56",
  grassBladeDeep: "#4E6848",
  flowerPetal: "#D3CEBA",
  flowerPetalWarm: "#CFC08C",
  flowerPetalEdge: "#D3CEBA",
  flowerCore: "#D9B54A",
  flowerCoreWarm: "#C98E3A",
  iconInk: "#ECEDE7",
  // 짙은 바탕에서 가지가 묻히지 않게 한 톤 밝힌다.
  bough: "#7A4E3E",
  // 눈은 밝은 몸 위에 있어 그대로 두고, 바탕 위로 드러나는 다리만 밝게 한다.
  castLeg: "#D9D4C7",
  castLegFar: "#A29D91",
  // 어두운 바탕에서는 동그라미가 잘 보여 테두리를 몸 색과 같게 둔다.
  castCircleEdge: "#FEF2D3",
  glassTint: "rgba(60, 63, 67, 0.55)",
  glassSolid: "rgba(54, 57, 61, 0.92)",
  glassEdge: "rgba(255, 255, 255, 0.12)",
  glassShadow: [
    "0 10px 28px rgba(0, 0, 0, 0.4)",
    "0 1px 3px rgba(0, 0, 0, 0.3)",
    "inset 0 1px 1px rgba(255, 255, 255, 0.14)",
  ].join(", "),
  lensFill: "rgba(255, 255, 255, 0.14)",
  lensEdge: "rgba(255, 255, 255, 0.2)",
  lensShadow: [
    "0 3px 10px rgba(0, 0, 0, 0.35)",
    "inset 0 1px 2px rgba(255, 255, 255, 0.18)",
  ].join(", "),
};

export const palettes: Record<Scheme, Palette> = {
  light: lightColors,
  dark: darkColors,
};

// 하단 아이콘과 씨앗주머니의 선 굵기. 그림 크기와 상관없이 화면에서 이 굵기(px)로 보이게 한다.
export const ICON_LINE_PX = 2;

// 두 "#RRGGBB" 색을 amount만큼 섞는다. 결과도 "#RRGGBB"라서 겹쳐 쓸 수 있다.
export function mix(hexColor: string, targetColor: string, amount: number) {
  const channel = (start: number) => {
    const value = parseInt(hexColor.slice(start, start + 2), 16);
    const target = parseInt(targetColor.slice(start, start + 2), 16);
    const mixed = Math.round(value + (target - value) * amount);
    return Math.min(255, Math.max(0, mixed)).toString(16).padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

// 열매의 그늘진 면과 밝은 면. 2D지만 살짝 입체감을 낼 때 쓴다.
export function darken(hexColor: string, amount: number) {
  return mix(hexColor, "#000000", amount);
}
export function lighten(hexColor: string, amount: number) {
  return mix(hexColor, "#FFFFFF", amount);
}

// 소설마다 붙는 색. 소설 id로 골라서 같은 소설은 항상 같은 색이 된다.
export const storyColors = [
  "#EE9F8E",
  "#F2C46D",
  "#B9AFE1",
  "#F0A868",
  "#E9A5C0",
  "#9DBEDC",
];

export function storyColorOf(novelId: number) {
  const index = Math.abs(novelId - 1) % storyColors.length;
  return storyColors[index];
}

// 소설 열매 모양. 모두 면이 보이는 입체(구·정육면체·피라미드·별사탕)이고, 같은 소설은 항상 같은 모양이다.
export type FruitShape = "sphere" | "cube" | "pyramid" | "star";
export const fruitShapes: FruitShape[] = ["sphere", "cube", "pyramid", "star"];

export function fruitShapeOf(novelId: number) {
  const index = Math.abs(novelId - 1) % fruitShapes.length;
  return fruitShapes[index];
}

// 작가 수. 열매로 퍼뜨리는 작품은 정원이 없어(서버가 null을 보냄) 쓴 작가 수만 보여 준다.
export function writersLabel(novel: {
  memberCount: number;
  memberLimit?: number | null;
}) {
  if (novel.memberLimit == null) return `작가 ${novel.memberCount}명`;
  return `작가 ${novel.memberCount}/${novel.memberLimit}명`;
}

// 가지가 갈라지는 작품의 목표 회차는 한 가지의 깊이라 전체 회차 수와 나눠 쓴다.
export function chaptersLabel(novel: {
  mode: "OPEN" | "CIRCLE";
  chapterCount: number;
  chapterLimit: number;
}) {
  if (novel.mode === "OPEN")
    return `${novel.chapterCount}개의 장 · 목표 ${novel.chapterLimit}화`;
  return `${novel.chapterCount}/${novel.chapterLimit}개의 장`;
}

export const statusLabel = {
  RECRUITING: "작가 모집 중",
  ONGOING: "이야기 이어가는 중",
  COMPLETED: "완결된 이야기",
};
