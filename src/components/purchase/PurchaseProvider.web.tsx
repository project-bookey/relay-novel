import type { ReactNode } from "react";

// 웹에는 앱 안 결제가 없다. 기본값(결제 없음)이 그대로 쓰인다.
export function PurchaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
