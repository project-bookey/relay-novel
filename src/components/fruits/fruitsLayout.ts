// 열매 탭 맨 위의 자리(시안 reference/sian/fruits-glass-b2). 목록 위 여백 아래에 맨 위 줄(열매 아이콘 제목)이 있고,
// 검색 유리 동그라미는 그 줄 오른쪽에 목록과 따로 떠 있어 내려도 그 자리에 남는다(사용자 요청 "검색 버튼은 계속 따라다니게").
// 검색 유리막의 검색칸도 이 동그라미 자리에서 펼쳐진다(SearchField).
export const LIST_TOP = 12;
// 목록의 양옆 여백. 검색 동그라미와 다시 나타나는 장르 바도 이 여백에 맞춘다.
export const LIST_SIDE = 24;
export const TOP_ROW_HEIGHT = 48;
export const SEARCH_SIZE = 44;
export const SEARCH_TOP = LIST_TOP + (TOP_ROW_HEIGHT - SEARCH_SIZE) / 2;

// 모든 이야기의 장르 바(GenreBar) 높이와, 아래 서가보다 양옆으로 조금 더 내미는 폭
// (사용자 요청 "카테고리를 소설 나열된 것보다 미세하게 넓게").
export const GENRE_BAR_HEIGHT = 50;
export const GENRE_BAR_OUTSET = 6;
// 내렸다가 위로 올리면 장르 바가 맨 위에 다시 나타난다. 그때 검색 동그라미와 가운데를 맞추는 위 자리와,
// 동그라미 + 간격만큼 비우는 오른쪽 자리.
export const BAR_REVEAL_TOP =
  LIST_TOP + TOP_ROW_HEIGHT / 2 - GENRE_BAR_HEIGHT / 2;
export const SEARCH_ROOM = SEARCH_SIZE + 8;
