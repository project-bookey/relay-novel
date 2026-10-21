import { Text } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../src/state/session";
import { BranchBin } from "../src/components/my/BranchBin";
import { useSunlight } from "../src/components/sunlight/useSunlight";
import { ErrorBox, Loading, Screen, useUi } from "../src/components/ui";

// 나뭇가지 수거함 화면(마이의 "나뭇가지 수거함" 줄에서 들어온다). 둘러보기에서도 예시 가지를 보여 준다.
export default function BranchBinScreen() {
  const { mode } = useSession();
  if (mode === "loading")
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (mode === "guest") return <Redirect href="/login" />;
  return (
    <Screen title="나뭇가지 수거함">
      <SunlightLine />
      <BranchBin />
    </Screen>
  );
}

// 살리는 데 햇살이 들므로 지금 가진 햇살을 위에 적어 둔다(채우기는 마이의 햇살 줄과 살리기 버튼이 맡는다).
function SunlightLine() {
  const ui = useUi();
  const wallet = useSunlight();
  if (wallet.error)
    return (
      <ErrorBox
        error={wallet.error}
        retry={() => {
          void wallet.refetch();
        }}
      />
    );
  if (wallet.data === undefined) return null;
  return <Text style={ui.body}>{`햇살 ${wallet.data.balance}개`}</Text>;
}
