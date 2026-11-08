"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DraggableAttributes, type DraggableSyntheticListeners } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Icon, Meta, Text } from "../ui";
import { AIVerdictPill, Stub, TripTicket, placeTone, verdictText } from "./index";
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
interface HandleProps {
  name: string;
  expanded: boolean;
  onToggle: () => void;
  attrs: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setRef: (el: HTMLElement | null) => void;
}

/** A press that stays inside this distance toggles. Past it, the sortable sensor reorders. */
const TAP_SLOP = 4;

function invoke(listeners: DraggableSyntheticListeners, name: string, event: ReactPointerEvent<HTMLButtonElement>) {
  const fn = listeners?.[name] as ((event: ReactPointerEvent<HTMLButtonElement>) => void) | undefined;
  fn?.(event);
}

/** The click that follows a tap can land on the ticket that just opened and close it again. */
function swallowNextClick() {
  document.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true, once: true });
}

function Handle({ name, expanded, onToggle, attrs, listeners, setRef }: HandleProps) {
  return (
    <button
      type="button"
      ref={setRef}
      className="rankrow__handle"
      {...attrs}
      {...listeners}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} details for ${name}. Drag to reorder, or press space and use the arrow keys.`}
      onPointerDown={(event) => {
        invoke(listeners, "onPointerDown", event);
        if (event.button !== 0 || !event.isPrimary) return;
        const startX = event.clientX;
        const startY = event.clientY;
        let moved = 0;
        const track = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const dist = dx * dx + dy * dy;
          if (dist > moved) moved = dist;
        };
        const finish = (ev: PointerEvent) => {
          window.removeEventListener("pointermove", track);
          window.removeEventListener("pointerup", finish);
          window.removeEventListener("pointercancel", cancel);
          if (ev.button !== 0 || moved > TAP_SLOP * TAP_SLOP) return;
          onToggle();
          swallowNextClick();
        };
        const cancel = () => {
          window.removeEventListener("pointermove", track);
          window.removeEventListener("pointerup", finish);
          window.removeEventListener("pointercancel", cancel);
        };
        window.addEventListener("pointermove", track);
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", cancel);
      }}
    >
      <Icon name="drag" size={20} stroke={2.4} />
    </button>
  );
}

function RankTicket({ item, index, shared, dragging, onToggle, handle }: { item: RankItem; index: number; shared: Shared; dragging: boolean; onToggle: () => void; handle: HandleProps }) {
  return (
    <div className="rankticket" data-dragging={dragging ? "" : undefined}>
      <TripTicket tone={placeTone(item.id)} small>
        <div className="ticket__top">
          <span className="row" style={{ gap: 8 }}>
            <span className="rankbadge"><Text variant="numeral-xxs" className="">{index + 1}</Text></span>
            {index === 0 && <Meta>Top pick</Meta>}
          </span>
          <span className="row" style={{ gap: 0 }}>
            <AIVerdictPill verdict={item.verdict} month={shared.month} source={shared.source} />
            <span className="rankticket__spacer" aria-hidden="true" />
          </span>
        </div>
        <Text variant="display-ticket" className="ticket__name">{item.name.toUpperCase()}</Text>
        <Meta>{shared.meta}</Meta>
        <Stub />
        <div className="row row--between" style={{ alignItems: "flex-end" }}>
          <div className="col" style={{ gap: 2 }}><Meta>Per person</Meta><Text variant="numeral-md">${item.per.toLocaleString("en-US")}</Text></div>
          <div className="col" style={{ gap: 2, alignItems: "flex-end" }}><Meta>Group of {shared.travelers}</Meta><Text variant="numeral-xs">${item.total.toLocaleString("en-US")} total</Text></div>
        </div>
        <div className="why"><Meta>Why it fits</Meta><span>{item.why}</span></div>
      </TripTicket>
      <button type="button" className="rankticket__hit" aria-expanded="true" aria-label={`Hide details for ${item.name}`} onClick={onToggle} />
      <span className="rankticket__handle">
        <Handle {...handle} />
      </span>
    </div>
  );
}

function CompactRow({ item, index, shared, dragging, onToggle, handle }: { item: RankItem; index: number; shared: Shared; dragging: boolean; onToggle: () => void; handle: HandleProps }) {
  return (
    <div className="rankrow" data-tone={placeTone(item.id)} data-dragging={dragging ? "" : undefined} data-new={item.isNew ? "" : undefined}>
      <button type="button" className="rankrow__main" aria-expanded="false" onClick={onToggle}>
        <span className="rankbadge"><Text variant="numeral-xxs" className="">{index + 1}</Text></span>
        <span className="rankrow__name"><Text variant="display-row" className="">{item.name.toUpperCase()}</Text>{item.sub && <Meta>{item.sub}</Meta>}</span>
        <span className="rankrow__price"><Text variant="numeral-xxs" className="">${item.per.toLocaleString("en-US")} / PP</Text><Meta>{verdictText(item.verdict, shared.month)}</Meta></span>
        <span className="sr-only">Show details</span>
      </button>
      <Handle {...handle} />
    </div>
  );
}

function SortableRow({ item, index, shared, expanded, onToggle }: { item: RankItem; index: number; shared: Shared; expanded: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 3 : undefined, position: "relative" as const };
  const handle: HandleProps = { name: item.name, expanded, onToggle, attrs: attributes, listeners, setRef: setActivatorNodeRef };
  const body = expanded
    ? <RankTicket item={item} index={index} shared={shared} dragging={isDragging} onToggle={onToggle} handle={handle} />
    : <CompactRow item={item} index={index} shared={shared} dragging={isDragging} onToggle={onToggle} handle={handle} />;
  return <div ref={setNodeRef} style={style}>{body}</div>;
}

/** Each place opens and closes on its own. #1 starts open. Tap the lines to toggle; drag them to reorder. */
export function RankList({ items, onReorder, shared }: { items: RankItem[]; onReorder: (ids: string[]) => void; shared: Shared }) {
  const [openIds, setOpenIds] = useState<string[]>(() => (items[0] ? [items[0].id] : []));
  const ids = items.map((item) => item.id);
  const open = openIds.filter((id) => ids.includes(id));
  if (open.length !== openIds.length) setOpenIds(open);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: TAP_SLOP } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
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
        <div className="col">{items.map((it, i) => <SortableRow key={it.id} item={it} index={i} shared={shared} expanded={open.includes(it.id)} onToggle={() => toggle(it.id)} />)}</div>
      </SortableContext>
    </DndContext>
  );
}
