'use client';

import { useState } from 'react';
import { Star, Trash2, Users, User, Play } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysis-store';
import { PERSONA_MAP } from '@/lib/constants';
import { useI18n } from '@/i18n/context';

/** Favorites management component */
export default function FavoritesManager() {
  const { t } = useI18n();
  const { favorites, selectedPersonas, mode, addFavorite, removeFavorite, loadFavorite } = useAnalysisStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim() || selectedPersonas.length === 0) return;
    addFavorite(newName.trim());
    setNewName('');
    setShowAdd(false);
  };

  if (favorites.length === 0 && !showAdd) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-[var(--foreground)]/40 flex items-center gap-1">
          <Star size={12} className="text-[var(--gold)]" />
          {t('favorites.title', favorites.length)}
        </h4>
        {selectedPersonas.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-[var(--gold)] hover:underline"
          >
            {t('favorites.addCurrent')}
          </button>
        )}
      </div>

      {/* Add favorite input */}
      {showAdd && (
        <div className="flex gap-2 animate-fade-in">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t('favorites.placeholder')}
            className="flex-1 px-2 py-1.5 rounded border border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-[var(--foreground)]/25"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="px-2 py-1.5 rounded bg-[var(--gold)] text-[var(--card-alt)] text-xs font-medium hover:bg-[var(--gold-dim)]"
          >
            {t('favorites.save')}
          </button>
        </div>
      )}

      {/* Favorites list */}
      <div className="space-y-1">
        {favorites.map((fav) => {
          const names = fav.personas.map((p) => PERSONA_MAP[p]?.nameZh || p).join(' + ');
          return (
            <div
              key={fav.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-[var(--card-alt)] border-[var(--card-border)] group hover:border-[var(--gold)]/30"
            >
              {/* Load button */}
              <button
                onClick={() => loadFavorite(fav.id)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  {fav.mode === 'group' ? (
                    <Users size={14} className="text-[var(--gold)]/60 shrink-0" />
                  ) : (
                    <User size={14} className="text-[var(--gold)]/60 shrink-0" />
                  )}
                  <span className="text-sm text-[var(--foreground)]/70 truncate">{fav.name}</span>
                </div>
                <p className="text-[11px] text-[var(--foreground)]/30 truncate mt-0.5">{names}</p>
              </button>

              {/* Delete button */}
              <button
                onClick={() => removeFavorite(fav.id)}
                className="shrink-0 p-1 text-[var(--foreground)]/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title={t('favorites.delete')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
