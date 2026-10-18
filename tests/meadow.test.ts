import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RIDGE_TOP,
  meadowPaths,
  ridgeAt,
  scatterMeadow,
} from "../src/design/meadow";

// 시안을 만든 390×844 화면에서 보이는 범위(열매 밭 그림 좌표)
const phone = { left: -23.9, right: 363.8, bottom: 499.8 };

test("grass starts growing behind the back edge of the fruit ground", () => {
  // 열매가 멈출 수 있는 땅(fruitLayout의 GROUND: x 24~316, 뒤쪽 끝 y 64)보다 풀이 나는 선이 늘 위에 있어
  // 어느 열매든 풀 사이에 놓인다.
  for (let x = 24; x <= 316; x += 2) {
    assert.ok(ridgeAt(x) < 64 - 4, `x ${x}: ${ridgeAt(x)}`);
  }
  assert.equal(Math.min(...[0, 100, 175, 250, 340].map(ridgeAt)), RIDGE_TOP);
  // 넓은 화면에서도 끊기지 않고 끝 높이로 이어진다.
  assert.ok(Number.isFinite(ridgeAt(-1000)) && Number.isFinite(ridgeAt(2000)));
});

test("grass and flowers grow below the ridge and bigger up front", () => {
  const decor = scatterMeadow(phone);
  assert.ok(decor.flowers.length >= 8);
  for (const item of [...decor.tufts, ...decor.flowers]) {
    assert.ok(item.x > phone.left - 10 && item.x < phone.right + 10);
    assert.ok(item.y > ridgeAt(item.x) && item.y < phone.bottom);
  }
  const back = decor.tufts.reduce((a, b) => (a.y < b.y ? a : b));
  const front = decor.tufts.reduce((a, b) => (a.y > b.y ? a : b));
  assert.ok(front.size > back.size);
  // 같은 화면이면 언제나 같은 자리에 핀다.
  assert.deepEqual(scatterMeadow(phone), decor);
  const paths = meadowPaths(decor);
  assert.ok(paths.sideBlades.startsWith("M") && paths.petals[0].length > 0);
});

test("wider screens get more grass, spread to the new edges", () => {
  const tablet = { left: -120, right: 460, bottom: 520 };
  const decor = scatterMeadow(tablet);
  assert.ok(decor.tufts.length > scatterMeadow(phone).tufts.length);
  assert.ok(decor.tufts.some((tuft) => tuft.x < phone.left));
  assert.ok(decor.tufts.some((tuft) => tuft.x > phone.right));
});

test("grass spreads evenly without clumps or empty patches", () => {
  const { tufts } = scatterMeadow(phone);
  // 사용자 요청으로 시안보다 줄였다.
  assert.ok(tufts.length >= 12 && tufts.length <= 20, `${tufts.length}`);
  // 어느 두 포기도 바짝 붙어 나지 않는다.
  for (const [index, tuft] of tufts.entries()) {
    for (const other of tufts.slice(index + 1)) {
      assert.ok(Math.hypot(tuft.x - other.x, tuft.y - other.y) > 30);
    }
  }
  // 풀이 나는 곳을 위아래 네 줄, 좌우 두 쪽으로 나누면 어느 칸에도 풀이 있다.
  const top = 60;
  const bottom = phone.bottom - 100;
  for (let band = 0; band < 4; band++) {
    const from = top + ((bottom - top) * band) / 4;
    const to = top + ((bottom - top) * (band + 1)) / 4;
    for (const half of [0, 1]) {
      const middle = (phone.left + phone.right) / 2;
      assert.ok(
        tufts.some(
          (tuft) =>
            tuft.y >= from &&
            tuft.y < to &&
            (half === 0 ? tuft.x < middle : tuft.x >= middle),
        ),
        `band ${band}, half ${half}`,
      );
    }
  }
});
