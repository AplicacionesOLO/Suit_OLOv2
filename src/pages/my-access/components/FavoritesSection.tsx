import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FavoriteWithDetails } from '@/services/security/favoritesService';

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

function getColors(c: string) { return colorMap[c] || colorMap.emerald; }

interface SortableCardProps {
  fav: FavoriteWithDetails;
  isEditing: boolean;
  onOpen: (fav: FavoriteWithDetails) => void;
}

function SortableCard({ fav, isEditing, onOpen }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fav.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const colors = getColors(fav.application_color || 'emerald');
  const isEmbedded = fav.instance_open_mode === 'embedded';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditing && onOpen(fav)}
      className={`glass-panel rounded-xl p-3 transition-all duration-200 group cursor-pointer ${
        isEditing
          ? 'border border-accent-500/30'
          : 'hover:border-secondary-500/20 hover:bg-background-100'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isEditing && (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-foreground-600 hover:text-foreground-400 cursor-grab active:cursor-grabbing transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="ri-draggable text-sm"></i>
          </button>
        )}
        <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <i className={`${fav.application_icon || 'ri-apps-line'} ${colors.text} text-base`}></i>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-foreground-200 truncate">{fav.application_name}</h4>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {fav.instance_name && (
              <span className="text-2xs text-foreground-500">Instancia: {fav.instance_name}</span>
            )}
            {fav.tenant_name && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs bg-secondary-500/10 text-secondary-400">
                {fav.tenant_name}
              </span>
            )}
            {fav.country_name && (
              <span className="text-2xs text-foreground-600">{fav.country_name}</span>
            )}
          </div>
        </div>
        {!isEditing && (
          <span className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-2xs font-medium border ${
            isEmbedded
              ? 'bg-accent-500/10 text-accent-400 border-accent-500/20'
              : 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20'
          }`}>
            {isEmbedded ? 'EMB' : 'EXT'}
          </span>
        )}
      </div>
    </div>
  );
}

interface FavoritesSectionProps {
  favorites: FavoriteWithDetails[];
  loading: boolean;
  onOpenApp: (fav: FavoriteWithDetails) => void;
  onReorder: (newOrder: FavoriteWithDetails[]) => void;
}

export default function FavoritesSection({ favorites, loading, onOpenApp, onReorder }: FavoritesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = favorites.findIndex((f) => f.id === active.id);
    const newIndex = favorites.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(favorites, oldIndex, newIndex);
    onReorder(newOrder);
  }, [favorites, onReorder]);

  if (!loading && favorites.length === 0) return null;

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground-200 flex items-center gap-2">
          <span className="w-4 h-4 flex items-center justify-center text-amber-400"><i className="ri-star-fill"></i></span>
          Favoritos
          <span className="text-2xs text-foreground-500 font-normal ml-1">({favorites.length}/8)</span>
        </h2>
        {favorites.length > 1 && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`h-7 px-3 rounded-lg text-2xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              isEditing
                ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                : 'bg-background-100 text-foreground-500 border border-secondary-500/10 hover:border-secondary-500/30'
            }`}
          >
            {isEditing ? 'Listo' : 'Editar orden'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-3 h-[72px] animate-pulse bg-background-100/50" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={favorites.map((f) => f.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {favorites.map((fav) => (
                <SortableCard
                  key={fav.id}
                  fav={fav}
                  isEditing={isEditing}
                  onOpen={onOpenApp}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}