"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Icon, Meta, Text } from "../ui";
import { AIVerdictPill, Stub, TripTicket, placeTone, verdictText } from "./index";
import { cn, col, rankBadge, rankHandle, rankHandleWrap, rankHit, rankItem, rankItemInner, rankItemRow, rankItemTicket, rankMain, rankName, rankNameText, rankPrice, rankRow, rankSpacer, rankTicket, row, ticketName, ticketTop, toneClass, why } from "../ui/tw";
import type { Verdict } from "@/lib/rank";
import { columnRankDelta } from "@/lib/rankDrag";

// Applied to the drag delta itself (not only the painted style) so collision
// detection and dnd-kit's layout compensation stay in the column with the card.
const lockRankDragToColumn: Modifier = ({ transform }) => columnRankDelta(transform);

export interface RankItem {
  id: string;
  name: string;
  per: number; // per person
  total: number; // group total
  verdict: Verdict;
  sub?: string; // "JL's idea · AI priced"
  why: string;
  isNew?: boolean;
}

interface Shared { month: string; source: "AI" | "Est."; travelers: number; meta: string }
interface HandleProps { name: string; attrs: object; listeners: object | undefined; setRef: (el: HTMLElement | null) => void }

function Handle({ name, attrs, listeners, setRef }: HandleProps) {
  return (
    <button type="button" ref={setRef} className={rankHandle} {...attrs} {...listeners} aria-label={`Drag to reorder ${name}. Or focus and press space, then use the arrow keys.`}>
      <Icon name="drag" size={20} stroke={2.4} />
    </button>
  );
}

function RankTicket({ item, index, shared, dragging, onToggle, handle }: { item: RankItem; index: number; shared: Shared; dragging: boolean; onToggle: () => void; handle: HandleProps }) {
  return (
    <div className={rankTicket} data-dragging={dragging ? "" : undefined}>
      <TripTicket tone={placeTone(item.id)}>
        <div className={ticketTop}>
          <span className={row}>
            <span className={rankBadge}><Text variant="numeral-xxs">{index + 1}</Text></span>
            {index === 0 && <Meta>Top pick</Meta>}
          </span>
          <span className={cn(row, "gap-0")}>
            <AIVerdictPill verdict={item.verdict} month={shared.month} source={shared.source} />
            <span className={rankSpacer} aria-hidden="true" />
          </span>
        </div>
        <Text variant="display-ticket" className={ticketName}>{item.name.toUpperCase()}</Text>
        <Meta>{shared.meta}</Meta>
        <Stub small />
        <div className={cn(row, "items-end justify-between")}>
          <div className={cn(col, "gap-0.5")}><Meta>Per person</Meta><Text variant="numeral-md">${item.per.toLocaleString("en-US")}</Text></div>
          <div className={cn(col, "items-end gap-0.5")}><Meta>Group of {shared.travelers}</Meta><Text variant="numeral-xs">${item.total.toLocaleString("en-US")} total</Text></div>
        </div>
        <div className={why}><Meta>Why it fits</Meta><span>{item.why}</span></div>
      </TripTicket>
      <button type="button" className={rankHit} aria-expanded="true" aria-label={`Hide details for ${item.name}`} onClick={onToggle} />
      <span className={rankHandleWrap}>
        <Handle {...handle} />
      </span>
    </div>
  );
}

function CompactRow({ item, index, shared, dragging, onToggle, handle }: { item: RankItem; index: number; shared: Shared; dragging: boolean; onToggle: () => void; handle: HandleProps }) {
  return (
    <div className={cn(rankRow, toneClass[placeTone(item.id)])} data-tone={placeTone(item.id)} data-dragging={dragging ? "" : undefined} data-new={item.isNew ? "" : undefined}>
      <button type="button" className={rankMain} aria-expanded="false" onClick={onToggle}>
        <span className={rankBadge}><Text variant="numeral-xxs">{index + 1}</Text></span>
        <span className={rankName}><Text variant="display-row" className={rankNameText}>{item.name.toUpperCase()}</Text>{item.sub && <Meta>{item.sub}</Meta>}</span>
        <span className={rankPrice}><Text variant="numeral-xxs">${item.per.toLocaleString("en-US")} / PP</Text><Meta>{verdictText(item.verdict, shared.month)}</Meta></span>
        <span className="sr-only">Show details</span>
      </button>
      <Handle {...handle} />
    </div>
  );
}

function SortableRow({ item, index, shared, expanded, onToggle }: { item: RankItem; index: number; shared: Shared; expanded: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  // Translate only, and only on Y. Scale would stretch an item moving into a slot of a
  // different height. X is dropped so the ticket cannot follow the pointer off the stack.
  // Y stays the pointer delta, which keeps the grab offset.
  const locked = transform ? columnRankDelta(transform) : null;
  const style = { transform: CSS.Translate.toString(locked), transition, zIndex: isDragging ? 3 : undefined, position: "relative" as const };
  const live: HandleProps = { name: item.name, attrs: attributes, listeners, setRef: setActivatorNodeRef };
  const idle: HandleProps = { name: item.name, attrs: {}, listeners: undefined, setRef: () => {} }; // only the visible look owns the drag handle
  // Both looks stay mounted: the compact row shrinks while the ticket unfolds (and back), so opening and closing animate.
  // The hidden one is `inert`, so it can't be tabbed to or clicked.
  return (
    <div ref={setNodeRef} style={style} className={rankItem} data-open={expanded ? "" : undefined}>
      <div className={rankItemRow} inert={expanded}>
        <div className={rankItemInner}><CompactRow item={item} index={index} shared={shared} dragging={isDragging} onToggle={onToggle} handle={expanded ? idle : live} /></div>
      </div>
      <div className={rankItemTicket} inert={!expanded}>
        <div className={rankItemInner}><RankTicket item={item} index={index} shared={shared} dragging={isDragging} onToggle={onToggle} handle={expanded ? live : idle} /></div>
      </div>
    </div>
  );
}

/** One place is open at a time (#1 to start). Opening one closes the other. Drag the handle — not the card — to reorder. */
export function RankList({ items, onReorder, shared }: { items: RankItem[]; onReorder: (ids: string[]) => void; shared: Shared }) {
  const [openId, setOpenId] = useState<string | null>(() => items[0]?.id ?? null);
  const ids = items.map((item) => item.id);
  if (openId && !ids.includes(openId)) setOpenId(null);
  // Stay open during a drag. Closing the ticket would shift every row under the finger,
  // so the card would jump off the grab and drop where the cursor was instead of where the card is.
  const isOpen = (id: string) => openId === id;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }
  function end(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[lockRankDragToColumn]} autoScroll={{ layoutShiftCompensation: { x: false, y: true } }} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={col}>{items.map((it, i) => <SortableRow key={it.id} item={it} index={i} shared={shared} expanded={isOpen(it.id)} onToggle={() => toggle(it.id)} />)}</div>
      </SortableContext>
    </DndContext>
  );
}
