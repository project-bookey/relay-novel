import { test } from "node:test";
import assert from "node:assert/strict";
import {
  brightnessOf,
  fruitGeometries,
  GROUND_LINE,
  SHADOW_BOX,
  type Facet,
} from "../src/design/fruitShapes";
import { fruitShapes } from "../src/theme";

function middleOf(facet: Facet) {
  const count = facet.corners.length;
  return {
    x: facet.corners.reduce((sum, corner) => sum + corner.x, 0) / count,
    y: facet.corners.reduce((sum, corner) => sum + corner.y, 0) / count,
  };
}

test("every fruit is a solid made of several faces", () => {
  for (const shape of fruitShapes) {
    assert.ok(fruitGeometries[shape].facets.length >= 2, shape);
  }
});

test("every fruit leaves room for its stem and leaf inside the drawing", () => {
  for (const shape of fruitShapes) {
    // 잎의 가장 높은 곳은 꼭지 시작점보다 7.8만큼 위다.
    assert.ok(fruitGeometries[shape].stemBase - 7.8 >= 0, shape);
  }
});

test("the top of a cube is its brightest face and the right side its darkest", () => {
  const [top, left, right] = fruitGeometries.cube.facets.map((facet) =>
    brightnessOf(facet.facing),
  );
  assert.ok(top > left && left > right);
});

test("a pyramid's left face catches more light than its right face", () => {
  const [left, right] = fruitGeometries.pyramid.facets.map((facet) =>
    brightnessOf(facet.facing),
  );
  assert.ok(left > right);
});

test("sphere faces toward the top left are brighter than faces toward the bottom right", () => {
  const facets = fruitGeometries.sphere.facets;
  const average = (selected: Facet[]) =>
    selected.reduce((sum, facet) => sum + brightnessOf(facet.facing), 0) /
    selected.length;
  const towardLight = facets.filter((facet) => {
    const middle = middleOf(facet);
    return middle.x < 18 && middle.y < 21;
  });
  const awayFromLight = facets.filter((facet) => {
    const middle = middleOf(facet);
    return middle.x > 22 && middle.y > 25;
  });
  assert.ok(towardLight.length > 0 && awayFromLight.length > 0);
  assert.ok(average(towardLight) > average(awayFromLight));
});

test("a star candy's bumps show both lit and shaded sides", () => {
  // 마지막 면은 가운데 둥근 몸통이고, 그 앞은 돌기마다 두 면씩이다.
  const bumpSides = fruitGeometries.star.facets.slice(0, -1);
  const brightness = bumpSides.map((facet) => brightnessOf(facet.facing));
  assert.ok(Math.max(...brightness) - Math.min(...brightness) > 0.6);
  let bumpsWithTwoTones = 0;
  for (let index = 0; index < brightness.length; index += 2) {
    if (Math.abs(brightness[index] - brightness[index + 1]) > 0.2)
      bumpsWithTwoTones += 1;
  }
  // 빛과 나란히 놓인 돌기 몇 개를 빼면 돌기마다 한쪽은 밝고 한쪽은 어둡다.
  const bumpCount = bumpSides.length / 2;
  assert.ok(
    bumpsWithTwoTones >= Math.ceil(bumpCount * 0.75),
    `두 톤인 돌기 ${bumpsWithTwoTones}/${bumpCount}개`,
  );
});

test("every fruit rests on the ground instead of floating", () => {
  for (const shape of fruitShapes) {
    const lowest = Math.max(
      ...fruitGeometries[shape].outline.map((point) => point.y),
    );
    assert.ok(Math.abs(lowest - GROUND_LINE) < 0.01, `${shape} 바닥 ${lowest}`);
  }
});

// 열매가 땅에 닿는 점(윤곽에서 가장 낮은 점)
function contactOf(shape: (typeof fruitShapes)[number]) {
  return fruitGeometries[shape].outline.reduce((lowest, point) =>
    point.y > lowest.y ? point : lowest,
  );
}

test("a shadow starts exactly where its fruit touches the ground", () => {
  for (const shape of fruitShapes) {
    const contact = contactOf(shape);
    const touches = fruitGeometries[shape].shadow.some(
      (point) =>
        Math.abs(point.x - contact.x) < 0.01 &&
        Math.abs(point.y - contact.y) < 0.01,
    );
    assert.ok(touches, shape);
  }
});

test("shadows stretch to the right and back, away from the light", () => {
  for (const shape of fruitShapes) {
    const contact = contactOf(shape);
    // 열매 크기(40)의 1/8보다 멀리, 땅에 닿은 점의 오른쪽 뒤로 뻗은 그림자가 있어야 한다.
    const reachesBackRight = fruitGeometries[shape].shadow.some(
      (point) => point.x - contact.x > 5 && contact.y - point.y > 5,
    );
    assert.ok(reachesBackRight, shape);
  }
});

test("no shadow falls in front of a fruit, where the light comes from", () => {
  for (const shape of fruitShapes) {
    for (const point of fruitGeometries[shape].shadow) {
      assert.ok(point.y <= GROUND_LINE + 0.01, shape);
    }
  }
});

test("every shadow fits inside the shadow drawing area", () => {
  const right = SHADOW_BOX.left + SHADOW_BOX.width;
  const bottom = SHADOW_BOX.top + SHADOW_BOX.height;
  for (const shape of fruitShapes) {
    for (const point of fruitGeometries[shape].shadow) {
      assert.ok(point.x >= SHADOW_BOX.left && point.x <= right, shape);
      assert.ok(point.y >= SHADOW_BOX.top && point.y <= bottom, shape);
    }
  }
});
