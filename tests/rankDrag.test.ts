import { test } from "node:test";
import assert from "node:assert/strict";
import { columnRankDelta } from "../lib/rankDrag.ts";

test("a horizontal drag does not pull a rank ticket out of the column", () => {
  assert.deepEqual(columnRankDelta({ x: 260, y: 0, scaleX: 1, scaleY: 1 }), { x: 0, y: 0, scaleX: 1, scaleY: 1 });
});

test("reorder keeps the vertical grab offset and drops horizontal follow", () => {
  // Grabbed 40px below the card top, then the pointer moves up and far to the right.
  const cardTop = 400;
  const grabOffsetY = 40;
  const pointerDelta = { x: 220, y: -90 };
  const locked = columnRankDelta(pointerDelta);
  const cardTopAfter = cardTop + locked.y;
  const cursorY = cardTop + grabOffsetY + pointerDelta.y;

  assert.equal(locked.x, 0);
  assert.equal(locked.y, pointerDelta.y);
  // The grabbed point stays under the cursor. The card top does not snap to it.
  assert.equal(cardTopAfter + grabOffsetY, cursorY);
  assert.notEqual(cardTopAfter, cursorY);
});

test("vertical movement is unchanged when the pointer also drifts sideways", () => {
  assert.deepEqual(columnRankDelta({ x: -48, y: 128 }), { x: 0, y: 128 });
});
