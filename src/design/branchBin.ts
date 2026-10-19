// 나뭇가지 수거함의 남은 날 문구. 수거·삭제 판정은 서버가 하고, 앱은 서버가 준 지울 날(purgeAt)만 읽는다.
const DAY_MS = 24 * 60 * 60 * 1000;

// 지울 날까지 남은 날. 하루가 안 남았으면 0, 이미 지났으면 0.
export function daysUntilPurge(purgeAt: string, now: Date): number {
  const left = new Date(purgeAt).getTime() - now.getTime();
  if (left <= 0) return 0;
  return Math.floor(left / DAY_MS);
}

export function purgeLabel(purgeAt: string, now: Date): string {
  const days = daysUntilPurge(purgeAt, now);
  if (days === 0) return "오늘 안에 사라져요";
  return `${days}일 뒤 사라져요`;
}
