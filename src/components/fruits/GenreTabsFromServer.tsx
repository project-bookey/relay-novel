import { useQuery } from "@tanstack/react-query";
import { novels } from "../../api/novels";
import { demoGenres } from "../../api/demo";
import { ErrorBox } from "../ui";
import { GenreBar } from "./GenreBar";
import { GenreTabs } from "./GenreTabs";

// 장르 목록은 서버가 정한다(GET /novels/genres). 둘러보기에서는 같은 목록의 예시를 쓴다.
// 열매 서가는 유리 장르 바(bar), 검색 유리막은 밑줄 글자 탭(tabs)으로 보인다.
export function GenreTabsFromServer({
  isDemo,
  selected,
  onToggle,
  onClear,
  look = "tabs",
}: {
  isDemo: boolean;
  selected: string[];
  onToggle: (genre: string) => void;
  onClear: () => void;
  look?: "tabs" | "bar";
}) {
  const genres = useQuery({
    queryKey: ["genres"],
    queryFn: novels.genres,
    enabled: !isDemo,
    staleTime: 60 * 60 * 1000,
  });
  if (!isDemo && genres.error)
    return (
      <ErrorBox
        error={genres.error}
        retry={() => {
          void genres.refetch();
        }}
      />
    );
  // 불러오는 동안에도 "전체" 탭은 보여 자리가 흔들리지 않게 한다.
  const names = isDemo ? demoGenres : (genres.data ?? []);
  if (look === "bar")
    return (
      <GenreBar
        genres={names}
        selected={selected}
        onToggle={onToggle}
        onClear={onClear}
      />
    );
  return (
    <GenreTabs
      genres={names}
      selected={selected}
      onToggle={onToggle}
      onClear={onClear}
    />
  );
}
