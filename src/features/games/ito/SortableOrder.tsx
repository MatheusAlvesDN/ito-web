// Fila de ordenação do ITO. Líder: arrastar (ponteiro/teclado via dnd-kit) ou botões ↑/↓ → MOVE.
// Os outros veem a mesma fila (ao vivo, vinda do servidor) só para leitura.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton, PlayerAvatar, cx, focusRing } from '../../../ui';
import { seatOf } from '../seats';
import type { SeatInfo } from '../types';

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface Props {
  order: string[];
  seatsById: Record<string, SeatInfo>;
  canEdit: boolean;
  showYou: boolean;
  scale: number;
  onMove: (seatId: string, toIndex: number) => void;
}

export function SortableOrder({ order: serverOrder, seatsById, canEdit, showYou, scale, onMove }: Props) {
  // Ordem otimista só até o servidor responder (descartada assim que `order` muda).
  const serverKey = serverOrder.join('|');
  const [pending, setPending] = useState<{ base: string; order: string[] } | null>(null);
  const order = pending && pending.base === serverKey ? pending.order : serverOrder;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (seatId: string, toIndex: number) => {
    const from = order.indexOf(seatId);
    if (from < 0 || toIndex < 0 || toIndex >= order.length || from === toIndex) return;
    setPending({ base: serverKey, order: arrayMove(order, from, toIndex) });
    onMove(seatId, toIndex);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(String(active.id), order.indexOf(String(over.id)));
  };

  const name = (id: string | number) => seatOf(seatsById, String(id)).name;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Pegou ${name(active.id)}. Posição ${order.indexOf(String(active.id)) + 1} de ${order.length}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} sobre a posição ${order.indexOf(String(over.id)) + 1}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${name(active.id)} solto na posição ${order.indexOf(String(over.id)) + 1}.` : `${name(active.id)} solto.`,
    onDragCancel: ({ active }) => `Movimento de ${name(active.id)} cancelado.`,
  };

  const list = (
    <ol className="space-y-2" aria-label="Ordem do menor para o maior">
      {order.map((id, i) => (
        <Row
          key={id}
          id={id}
          index={i}
          total={order.length}
          seat={seatOf(seatsById, id)}
          canEdit={canEdit}
          showYou={showYou}
          onMove={move}
        />
      ))}
    </ol>
  );

  return (
    <section className="space-y-2" aria-label="Fila de cartas">
      <div aria-hidden className="flex justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted">
        <span>Menor (1)</span>
        <span>Maior ({scale})</span>
      </div>
      {canEdit ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: 'Para mover, pressione espaço ou Enter, use as setas para cima e para baixo e pressione espaço de novo para soltar. Esc cancela.',
            },
          }}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}
    </section>
  );
}

interface RowProps {
  id: string;
  index: number;
  total: number;
  seat: SeatInfo;
  canEdit: boolean;
  showYou: boolean;
  onMove: (seatId: string, toIndex: number) => void;
}

function Row(props: RowProps) {
  return props.canEdit ? <SortableRow {...props} /> : <RowBody {...props} />;
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  return (
    <RowBody
      {...props}
      dragging={isDragging}
      liRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      handle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${props.seat.name} (posição ${props.index + 1} de ${props.total})`}
          className={cx(
            'flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink active:cursor-grabbing',
            focusRing,
          )}
        >
          <GripVertical aria-hidden className="h-5 w-5" />
        </button>
      }
    />
  );
}

function RowBody({
  id,
  index,
  total,
  seat,
  canEdit,
  showYou,
  onMove,
  dragging,
  liRef,
  style,
  handle,
}: RowProps & {
  dragging?: boolean;
  liRef?: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  handle?: ReactNode;
}) {
  return (
    <li
      ref={liRef}
      style={style}
      className={cx(
        'relative flex items-center gap-2 rounded-2xl border bg-surface p-2 pr-2.5 transition-shadow',
        dragging ? 'z-20 border-brand shadow-overlay' : 'border-line shadow-raised',
      )}
    >
      {handle}
      <span className={cx('w-6 text-center font-display text-sm font-bold text-muted', !handle && 'ml-1')}>{index + 1}º</span>
      <PlayerAvatar name={seat.name} avatar={seat.avatar} size="sm" decorative />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {seat.name}
        {showYou && seat.mine && <span className="ml-1 text-xs font-medium text-muted">(você)</span>}
      </span>
      {canEdit ? (
        <span className="flex shrink-0 gap-1">
          <IconButton
            size="sm"
            variant="soft"
            aria-label={`Mover ${seat.name} para cima`}
            icon={<ChevronUp />}
            disabled={index === 0}
            onClick={() => onMove(id, index - 1)}
          />
          <IconButton
            size="sm"
            variant="soft"
            aria-label={`Mover ${seat.name} para baixo`}
            icon={<ChevronDown />}
            disabled={index === total - 1}
            onClick={() => onMove(id, index + 1)}
          />
        </span>
      ) : (
        <span
          aria-label="Número escondido"
          className="flex h-9 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 font-display text-lg font-bold text-muted"
        >
          ?
        </span>
      )}
    </li>
  );
}
