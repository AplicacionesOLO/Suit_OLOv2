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
import { groupApps } from '@/utils/groupApps';
import type { FavoriteWithDetails } from '@/services/security/favoritesService';

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-600', border: 'border-amber-500/30' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-600', border: 'border-violet-500/30' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-600', border: 'border-rose-500/30' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-600', border: 'border-indigo-500/30' },
  red: { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500/30' },
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
      className={`glass-panel rounded-lg p-2.5 transition-all duration-200 cursor-pointer ${
        isEditing
          ? 'border border-accent-500/40'
          : 'hover:border-secondary-500/40 hover:bg-background-100'
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
        <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
          <i className={`${fav.application_icon || 'ri-apps-line'} ${colors.text} text-base`}></i>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-foreground-200 truncate">{fav.application_name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            {fav.instance_name && (
              <span className="text-2xs text-foreground-500 truncate">{fav.instance_name}</span>
            )}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border ${
              isEmbedded
                ? 'bg-accent-100 text-accent-700 border-accent-200'
                : 'bg-secondary-100 text-secondary-700 border-secondary-200'
            }`}>
              {isEmbedded ? 'EMB' : 'EXT'}
            </span>
          </div>
        </div>
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

  const favoriteGroups = groupApps(favorites);
  const showGrouping = favoriteGroups.length > 1;

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground-200 flex items-center gap-2">
          <i className="ri-star-fill text-amber-500"></i>
          Favoritos
          <span className="text-2xs text-foreground-500 font-normal ml-1">({favorites.length}/8)</span>
        </h2>
        {favorites.length > 1 && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`h-7 px-3 rounded-lg text-2xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              isEditing
                ? 'bg-accent-100 text-accent-700 border border-accent-200'
                : 'bg-background-100 text-foreground-500 border border-secondary-500/25 hover:border-secondary-500/40'
            }`}
          >
            {isEditing ? 'Listo' : 'Editar orden'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-lg p-2.5 h-[56px] animate-pulse bg-background-100/50" />
          ))}
        </div>
      ) : showGrouping ? (
        <div className="space-y-4">
          {favoriteGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded bg-secondary-100 border border-secondary-200 flex items-center justify-center">
                    <i className={`${group.icon} ${group.iconColor} text-xs`}></i>
                  </span>
                  <h3 className="text-xs font-semibold text-foreground-400">{group.label}</h3>
                  <span className="text-2xs text-foreground-600 font-normal">({group.items.length})</span>
                  <div className="flex-1 h-px bg-secondary-500/20"></div>
                </div>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={group.items.map((f) => f.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                    {group.items.map((fav) => (
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
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={favorites.map((f) => f.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
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