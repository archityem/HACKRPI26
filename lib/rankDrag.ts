/** Pointer movement while a rank ticket is held. `y` is the delta from the grab. */
export interface RankPointerDelta {
  x: number;
  y: number;
}

/** How far a press must move before it becomes a reorder, on the card or the grip. */
export const RANK_DRAG_DISTANCE_PX = 4;

export type RankPickSurface = "body" | "handle";

/**
 * A click-hold-drag on the ticket body starts a reorder, same as the grip.
 * A press that does not move is a click: the body toggles, the grip does not.
 */
export function rankPickAction(surface: RankPickSurface, distancePx: number): "reorder" | "toggle" | "none" {
  if (distancePx >= RANK_DRAG_DISTANCE_PX) return "reorder";
  return surface === "body" ? "toggle" : "none";
}

/**
 * Insert the active ticket at the rank under the pointer.
 * Dropping on itself, or on an id that is not in the list, leaves the order unchanged.
 * Matches dnd-kit's arrayMove: the removed item is inserted at `over`'s index.
 */
export function reorderRank<T>(ids: readonly T[], activeId: T, overId: T | null | undefined): T[] | null {
  if (overId == null || activeId === overId) return null;
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0) return null;
  const next = ids.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
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
