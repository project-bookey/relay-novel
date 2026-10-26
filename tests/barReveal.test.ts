import { test } from "node:test";
import assert from "node:assert/strict";
import { barRevealOf, REVEAL_SLOP } from "../src/design/barReveal";

const base = { inPlaceUntil: 300, maxY: 2000 };

test("the genre bar comes back when scrolling up after it has passed the top", () => {
  assert.deepEqual(
    barRevealOf({ ...base, anchorY: 900, shown: false, y: 880 }),
    { shown: true, anchorY: 880 },
  );
  assert.deepEqual(
    barRevealOf({ ...base, anchorY: 880, shown: true, y: 920 }),
    { shown: false, anchorY: 920 },
  );
});

test("the genre bar stays hidden while its place in the list is still on screen", () => {
  assert.deepEqual(
    barRevealOf({ ...base, anchorY: 320, shown: true, y: 300 }),
    { shown: false, anchorY: 300 },
  );
  assert.equal(
    barRevealOf({ ...base, anchorY: 250, shown: false, y: 200 }).shown,
    false,
  );
});

test("small finger jitters are gathered until they pass the slop", () => {
  const first = barRevealOf({
    ...base,
    anchorY: 900,
    shown: false,
    y: 900 - REVEAL_SLOP,
  });
  assert.deepEqual(first, { shown: false, anchorY: 900 });
  assert.equal(
    barRevealOf({ ...base, ...first, y: 900 - REVEAL_SLOP - 1 }).shown,
    true,
  );
});

test("the bounce back from past the end is not taken as scrolling up", () => {
  assert.deepEqual(
    barRevealOf({ ...base, anchorY: 2000, shown: false, y: 2040 }),
    { shown: false, anchorY: 2000 },
  );
  assert.equal(
    barRevealOf({ ...base, anchorY: 2000, shown: false, y: 2000 }).shown,
    false,
  );
});
