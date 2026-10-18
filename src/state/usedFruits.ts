import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokenStorage } from "./tokens";

// 이어 쓴 열매(소설 id). 이어 쓰면 받은 열매·내 차례 목록에서는 빠지지만, 같은 소설이 홈 묶음에도 들어 있으면
// 묶음은 새로고침할 때까지 서버에 그대로 남아 열매가 홈에 계속 놓인다. 그래서 이어 쓴 소설을 기기에 적어 두고
// 홈 묶음 자리에는 놓지 않는다. 묶음에서 빠진 소설은 기록에서도 지워, 나중에 새 열매로 다시 놓일 수 있게 한다.
const keyPrefix = "relay-novel.used-fruits";

// 한 기기에서 여러 계정을 써도 기록이 섞이지 않게 회원마다 따로 둔다. 액세스 토큰(JWT)의 sub가 회원 id다.
async function storageKey() {
  const tokens = await tokenStorage.get();
  try {
    const payload = tokens!.accessToken
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const { sub } = JSON.parse(atob(padded));
    return sub ? `${keyPrefix}.${sub}` : keyPrefix;
  } catch {
    return keyPrefix;
  }
}

async function read(key: string): Promise<number[]> {
  try {
    const saved: unknown = JSON.parse(
      (await AsyncStorage.getItem(key)) ?? "[]",
    );
    return Array.isArray(saved)
      ? saved.filter((id): id is number => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

// 기록을 읽고 고쳐 쓰는 일이 겹쳐 방금 적은 열매가 지워지지 않도록 하나씩 차례로 한다.
let queue: Promise<unknown> = Promise.resolve();

// 기록이 바뀌었는지 돌려준다. 저장이 막혀도 발행이나 홈 그리기는 그대로 이어지게 실패는 삼킨다.
function update(change: (ids: number[]) => number[]): Promise<boolean> {
  const next = queue.then(async () => {
    const key = await storageKey();
    const before = await read(key);
    const after = change(before);
    if (after.length === before.length) return false;
    await AsyncStorage.setItem(key, JSON.stringify(after));
    return true;
  });
  queue = next.catch(() => {});
  return next.catch(() => false);
}

export const usedFruits = {
  load: () => queue.then(async () => read(await storageKey())),
  add: (novelId: number) =>
    update((ids) => (ids.includes(novelId) ? ids : [...ids, novelId])),
  // 지금 홈 묶음에 있는 소설만 남긴다.
  keepOnly: (novelIds: number[]) =>
    update((ids) => ids.filter((id) => novelIds.includes(id))),
};
