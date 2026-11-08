"use client";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Icon, Meta, Text } from "../ui";
import { AIVerdictPill, placeTone, verdictText } from "./index";
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
  flight?: number; // per person
  stay?: number; // per person
  daily?: number; // food + fun, per person
  /** True when flight/stay/daily are this member's own costs, false when they are group averages. */
  mine?: boolean;
}

interface Shared { month: string; source: "AI" | "Est."; travelers: number; meta: string }

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type HandleProps = { attrs?: object; listeners?: object; setRef?: (el: HTMLElement | null) => void };

function Handle({ name, attrs, listeners, setRef }: { name: string } & HandleProps) {
  return (
    <button type="button" ref={setRef} className="rankrow__handle" aria-label={`Drag to reorder ${name}. Or focus and press space, then use the arrow keys.`} {...attrs} {...listeners}>
      <Icon name="drag" size={20} stroke={2.4} />
    </button>
  );
}

/** One ranked place: a compact row that opens in place to show the details. Same structure for every rank. */
function Row({ item, index, shared, open, onToggle, handle, overlay, isNew }: {
  item: RankItem; index: number; shared: Shared; open: boolean; onToggle?: () => void; handle: HandleProps; overlay?: boolean; isNew?: boolean;
}) {
  const panel = `rank-${item.id}`;
  const hasParts = item.flight !== undefined && item.stay !== undefined && item.daily !== undefined;
  return (
    <div className="rankrow" data-tone={placeTone(item.id)} data-open={open ? "" : undefined} data-overlay={overlay ? "" : undefined} data-new={isNew ? "" : undefined}>
      <div className="rankrow__head">
        <button type="button" className="rankrow__toggle" aria-expanded={open} aria-controls={panel} onClick={onToggle} tabIndex={overlay ? -1 : undefined}>
          <span className="rankbadge"><Text variant="numeral-xxs" className="">{index + 1}</Text></span>
          <span className="rankrow__name"><Text variant="display-row" className="">{item.name.toUpperCase()}</Text>{item.sub && <Meta>{item.sub}</Meta>}</span>
          <span className="rankrow__price"><Text variant="numeral-xxs" className="">{usd(item.per)} / PP</Text><Meta>{verdictText(item.verdict, shared.month)}</Meta></span>
        </button>
        <Handle name={item.name} {...handle} />
      </div>
      <div className="rankrow__more" id={panel} inert={!open}>
        <div className="rankrow__moreinner">
          <div className="rankrow__body">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <AIVerdictPill verdict={item.verdict} month={shared.month} source={shared.source} />
              <Meta>{shared.meta}</Meta>
            </div>
            <div className="row row--between" style={{ alignItems: "flex-end" }}>
              <div className="col" style={{ gap: 2 }}><Meta>Per person</Meta><Text variant="numeral-md">{usd(item.per)}</Text></div>
              <div className="col" style={{ gap: 2, alignItems: "flex-end" }}><Meta>Group of {shared.travelers}</Meta><Text variant="numeral-xs">{usd(item.total)} total</Text></div>
            </div>
            {hasParts && (
              <div className="rankrow__parts">
                <div><Meta>Flights</Meta><Text variant="numeral-xxs" className="">{usd(item.flight!)}</Text></div>
                <div><Meta>Stay</Meta><Text variant="numeral-xxs" className="">{usd(item.stay!)}</Text></div>
                <div><Meta>Food + fun</Meta><Text variant="numeral-xxs" className="">{usd(item.daily!)}</Text></div>
              </div>
            )}
            {hasParts && <Meta>{item.mine ? "Your share, per person" : "Group average, per person"}</Meta>}
            <div className="why"><Meta>Why it fits</Meta><span>{item.why}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableRow({ item, index, shared, open, onToggle, hidden }: { item: RankItem; index: number; shared: Shared; open: boolean; onToggle: () => void; hidden: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: item.id, transition: { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" } });
  // Translate only: never scale, so a row moving into a different-sized slot cannot stretch.
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: hidden ? 0.3 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="ranksort">
      <Row item={item} index={index} shared={shared} open={open} onToggle={onToggle} isNew={item.isNew} handle={{ attrs: attributes, listeners, setRef: setActivatorNodeRef }} />
    </div>
  );
}

/** The ranked list: every place is the same row; tap one to open its details. Drag by the handle (mouse, touch or keyboard). */
export function RankList({ items, onReorder, shared }: { items: RankItem[]; onReorder: (ids: string[]) => void; shared: Shared }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(items[0] ? [items[0].id] : [])); // #1 starts open, once
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // While dragging everything is collapsed so all slots are the same height; the open set is untouched and returns on drop.
  const isOpen = (id: string) => activeId === null && openIds.has(id);
  const active = activeId ? items.findIndex((i) => i.id === activeId) : -1;

  function start(e: DragStartEvent) { setActiveId(String(e.active.id)); }
  function end(e: DragEndEvent) {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const ids = items.map((i) => i.id);
    onReorder(arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id))));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={start} onDragEnd={end} onDragCancel={() => setActiveId(null)}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="col">{items.map((it, i) => <SortableRow key={it.id} item={it} index={i} shared={shared} open={isOpen(it.id)} onToggle={() => toggle(it.id)} hidden={it.id === activeId} />)}</div>
      </SortableContext>
      <DragOverlay>
        {active >= 0 ? <Row item={items[active]} index={active} shared={shared} open={false} overlay handle={{}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
