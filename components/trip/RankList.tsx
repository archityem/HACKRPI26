"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
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

function Handle({ name, attrs, listeners, setRef }: { name: string; attrs: object; listeners: object | undefined; setRef: (el: HTMLElement | null) => void }) {
  return (
    <button type="button" ref={setRef} className="rankrow__handle" aria-label={`Drag to reorder ${name}. Or focus and press space, then use the arrow keys.`} {...attrs} {...listeners}>
      <Icon name="drag" size={20} stroke={2.4} />
    </button>
  );
}

function SortableRow({ item, index, shared }: { item: RankItem; index: number; shared: Shared }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const hero = index === 0;
  const body: ReactNode = hero ? (
    <TripTicket tone={placeTone(item.id)} small>
      <div className="ticket__top">
        <span className="row" style={{ gap: 8 }}>
          <span className="rankbadge"><Text variant="numeral-xxs" className="">1</Text></span>
          <Meta>Top pick</Meta>
        </span>
        <span className="row" style={{ gap: 0 }}>
          <AIVerdictPill verdict={item.verdict} month={shared.month} source={shared.source} />
          <Handle name={item.name} attrs={attributes} listeners={listeners} setRef={setActivatorNodeRef} />
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
  ) : (
    <div className="rankrow" data-tone={placeTone(item.id)} data-dragging={isDragging ? "" : undefined} data-new={item.isNew ? "" : undefined}>
      <span className="rankbadge"><Text variant="numeral-xxs" className="">{index + 1}</Text></span>
      <span className="rankrow__name"><Text variant="display-row" className="">{item.name.toUpperCase()}</Text>{item.sub && <Meta>{item.sub}</Meta>}</span>
      <span className="rankrow__price"><Text variant="numeral-xxs" className="">${item.per.toLocaleString("en-US")} / PP</Text><Meta>{verdictText(item.verdict, shared.month)}</Meta></span>
      <Handle name={item.name} attrs={attributes} listeners={listeners} setRef={setActivatorNodeRef} />
    </div>
  );
  return <div ref={setNodeRef} style={{ ...style, zIndex: isDragging ? 3 : undefined, position: "relative" }}>{body}</div>;
}

/** The ranked list: #1 is a big ticket, the rest are rows. Everything drags, with mouse, touch or keyboard. */
export function RankList({ items, onReorder, shared }: { items: RankItem[]; onReorder: (ids: string[]) => void; shared: Shared }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function end(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="col">{items.map((it, i) => <SortableRow key={it.id} item={it} index={i} shared={shared} />)}</div>
      </SortableContext>
    </DndContext>
  );
}
