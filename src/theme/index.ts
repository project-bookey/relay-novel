export const colors = {
  background: "#FFFFFF",
  paper: "#FFFFFF",
  ink: "#30362F",
  muted: "#868A80",
  line: "#E7E7DD",
  green: "#526552",
  mint: "#ADCBBE",
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
  // 열매 말풍선 카드의 그림자. 잉크색(ink)을 옅게 깐다.
  cardShadow: "rgba(48, 54, 47, 0.16)",
  // 하단 아이콘과 씨앗주머니의 선
  black: "#000000",
};

// 하단 아이콘과 씨앗주머니의 선 굵기. 그림 크기와 상관없이 화면에서 이 굵기(px)로 보이게 한다.
export const ICON_LINE_PX = 2;

// 결과도 "#RRGGBB"라서 lighten·darken을 겹쳐 쓸 수 있다.
function mixWith(hexColor: string, target: number, amount: number) {
  const channel = (start: number) => {
    const value = parseInt(hexColor.slice(start, start + 2), 16);
    const mixed = Math.round(value + (target - value) * amount);
    return Math.min(255, Math.max(0, mixed)).toString(16).padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

// 열매의 그늘진 면과 밝은 면. 2D지만 살짝 입체감을 낼 때 쓴다.
export function darken(hexColor: string, amount: number) {
  return mixWith(hexColor, 0, amount);
}
export function lighten(hexColor: string, amount: number) {
  return mixWith(hexColor, 255, amount);
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

export const statusLabel = {
  RECRUITING: "작가 모집 중",
  ONGOING: "이야기 이어가는 중",
  COMPLETED: "완결된 이야기",
};
