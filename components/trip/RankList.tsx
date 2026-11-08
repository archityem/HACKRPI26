"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Icon, Meta, Text } from "../ui";
import { AIVerdictPill, Stub, TripTicket, placeTone, verdictText } from "./index";
import { cn, col, rankBadge, rankHandle, rankHandleWrap, rankHit, rankMain, rankName, rankNameText, rankPrice, rankRow, rankSpacer, rankTicket, row, ticketName, ticketTop, toneClass, why } from "../ui/tw";
import type { Verdict } from "@/lib/rank";

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
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 3 : undefined, position: "relative" as const };
  const handle: HandleProps = { name: item.name, attrs: attributes, listeners, setRef: setActivatorNodeRef };
  const body = expanded
    ? <RankTicket item={item} index={index} shared={shared} dragging={isDragging} onToggle={onToggle} handle={handle} />
    : <CompactRow item={item} index={index} shared={shared} dragging={isDragging} onToggle={onToggle} handle={handle} />;
  return <div ref={setNodeRef} style={style}>{body}</div>;
}

/** Each place opens and closes on its own. #1 starts open. Drag the handle — not the card — to reorder. */
export function RankList({ items, onReorder, shared }: { items: RankItem[]; onReorder: (ids: string[]) => void; shared: Shared }) {
  const [openIds, setOpenIds] = useState<string[]>(() => (items[0] ? [items[0].id] : []));
  const ids = items.map((item) => item.id);
  const open = openIds.filter((id) => ids.includes(id));
  if (open.length !== openIds.length) setOpenIds(open);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function toggle(id: string) {
    setOpenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }
  function end(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={col}>{items.map((it, i) => <SortableRow key={it.id} item={it} index={i} shared={shared} expanded={open.includes(it.id)} onToggle={() => toggle(it.id)} />)}</div>
      </SortableContext>
    </DndContext>
  );
}
