/** Pointer movement while a rank ticket is held. `y` is the delta from the grab. */
export interface RankPointerDelta {
  x: number;
  y: number;
}

/**
 * Keep a dragged rank ticket in the column.
 * Horizontal movement is discarded so the card cannot slide off the stack.
 * Vertical movement stays the pointer delta from the grab, so the card keeps
 * the grabbed distance and does not jump to put its origin on the cursor.
 */
export function columnRankDelta<T extends RankPointerDelta>(delta: T): T {
  if (delta.x === 0) return delta;
  return { ...delta, x: 0 };
}
