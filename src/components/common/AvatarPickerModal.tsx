import { useState, useEffect } from 'react';
import { X, Dices, Check } from 'lucide-react';
import {
  AVATAR_CATEGORIES,
  getAvatarUrl,
  getRandomAvatar,
  parseAvatar,
} from '../../utils/avatarService';
import { audioService } from '../../utils/audioService';
import { triggerVibration } from '../../utils/syncService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  playerName?: string;
  onSave: (newAvatarId: string) => void;
}

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatar,
  playerName,
  onSave,
}: Props) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || 'avataaars:default');
  const [activeCategory, setActiveCategory] = useState(() => {
    const parsed = parseAvatar(currentAvatar);
    return AVATAR_CATEGORIES.some((c) => c.style === parsed.style) ? parsed.style : 'avataaars';
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatar || 'avataaars:default');
      const parsed = parseAvatar(currentAvatar);
      if (AVATAR_CATEGORIES.some((c) => c.style === parsed.style)) {
        setActiveCategory(parsed.style);
      }
    }
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  const currentCategoryObj =
    AVATAR_CATEGORIES.find((c) => c.style === activeCategory) || AVATAR_CATEGORIES[0];

  const handleSelect = (style: string, seed: string) => {
    const avatarKey = `${style}:${seed}`;
    setSelectedAvatar(avatarKey);
    audioService.playFlip();
    triggerVibration(20);
  };

  const handleRandomize = () => {
    const random = getRandomAvatar();
    setSelectedAvatar(random);
    const parsed = parseAvatar(random);
    setActiveCategory(parsed.style);
    audioService.playFlip();
    triggerVibration([20, 30, 20]);
  };

  const handleSave = () => {
    onSave(selectedAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Escolher Avatar</h3>
            {playerName && (
              <p className="text-xs text-slate-400 font-medium">
                Personalizando para <span className="font-bold text-slate-600">{playerName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Prévia em Destaque com Botão Sorteador */}
        <div className="p-4 bg-gradient-to-b from-blue-50/60 via-slate-50/30 to-white flex items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-md border-2 border-party-blue/40 ring-4 ring-blue-50 shrink-0">
                <img
                  src={getAvatarUrl(selectedAvatar)}
                  alt="Prévia do Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-party-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Selecionado
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">Toque abaixo para trocar</p>
            </div>
          </div>

          <button
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 shadow-xs active:scale-95 transition-all"
            title="Sortear avatar aleatório"
          >
            <Dices size={16} className="text-party-blue" />
            <span>Sortear</span>
          </button>
        </div>

        {/* Abas de Categorias */}
        <div className="px-3 pt-3 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {AVATAR_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.style;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.style);
                  audioService.playFlip();
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-party-blue text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {cat.seeds.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grade de Avatares da Categoria */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[340px]">
          <div className="grid grid-cols-4 gap-3">
            {currentCategoryObj.seeds.map((seed) => {
              const avatarKey = `${currentCategoryObj.style}:${seed}`;
              const isSelected = selectedAvatar === avatarKey;
              return (
                <button
                  key={seed}
                  onClick={() => handleSelect(currentCategoryObj.style, seed)}
                  className={`relative aspect-square rounded-2xl p-1 bg-slate-50 hover:bg-blue-50/50 border transition-all duration-150 active:scale-90 flex items-center justify-center ${
                    isSelected
                      ? 'border-party-blue ring-2 ring-party-blue/30 bg-blue-50/60 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  aria-label={`Avatar ${seed}`}
                >
                  <img
                    src={getAvatarUrl(avatarKey)}
                    alt={seed}
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-party-blue text-white rounded-full flex items-center justify-center shadow-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl border border-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-party-blue hover:bg-party-blueHover text-white font-bold text-sm rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Check size={16} />
            <span>Confirmar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
