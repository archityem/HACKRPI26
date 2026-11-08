import { test } from "node:test";
import assert from "node:assert/strict";
import { columnRankDelta, rankPickAction, reorderRank } from "../lib/rankDrag.ts";

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

const START = ["cartagena", "cancun", "sanjuan", "puntacana", "montego"];

test("a vertical drop inserts the ticket at the rank under the pointer", () => {
  // Montego Bay dragged up until San Juan is the closest row.
  assert.deepEqual(reorderRank(START, "montego", "sanjuan"), ["cartagena", "cancun", "montego", "sanjuan", "puntacana"]);
});

test("dropping a ticket on itself does not change the stored order", () => {
  assert.equal(reorderRank(START, "montego", "montego"), null);
  assert.equal(reorderRank(START, "montego", null), null);
  assert.equal(reorderRank(START, "montego", undefined), null);
});

test("a sideways release with no new row under the card does not rerank", () => {
  // Collision stays on the grabbed ticket when only x moved, so over === active.
  assert.equal(reorderRank(START, "cancun", "cancun"), null);
});

test("moving an open ticket down one rank inserts it under the next row", () => {
  assert.deepEqual(reorderRank(START, "cartagena", "cancun"), ["cancun", "cartagena", "sanjuan", "puntacana", "montego"]);
});

test("the card body and the grip share one reorder, and a plain click does not", () => {
  assert.equal(rankPickAction("body", 0), "toggle");
  assert.equal(rankPickAction("handle", 0), "none");
  assert.equal(rankPickAction("body", 3), "toggle");
  assert.equal(rankPickAction("handle", 3), "none");
  assert.equal(rankPickAction("body", 4), "reorder");
  assert.equal(rankPickAction("handle", 4), "reorder");
  assert.equal(rankPickAction("handle", 80), "reorder");
});
