import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, HelpCircle, X, ArrowRight, Check } from 'lucide-react';
import { api } from '../services/api';
import type { WhatDoYouKnowTheme } from '../types/game';
import { triggerVibration } from '../utils/syncService';
import { TagChip } from '../components/common/TagChip';

type Props = {
  onBack: () => void;
  onStart: (themes: WhatDoYouKnowTheme[]) => void;
};

export default function ThemeSelectionWhatDoYouKnow({ onBack, onStart }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['pessoal']));
  const [dbThemes, setDbThemes] = useState<WhatDoYouKnowTheme[]>([]);
  const [customThemes, setCustomThemes] = useState<WhatDoYouKnowTheme[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form States
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Carrega temas do banco e temas customizados do localStorage
  useEffect(() => {
    api.getThemes('whatdoyouknow').then((loaded) => {
      setDbThemes(loaded);
    }).catch(console.error);

    const saved = localStorage.getItem('whatdoyouknow_custom_themes');
    if (saved) {
      try {
        setCustomThemes(JSON.parse(saved));
      } catch (err) {
        console.error('Erro ao carregar temas customizados:', err);
      }
    }
  }, []);

  const toggleTheme = (id: string) => {
    triggerVibration(50);
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteTheme = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerVibration([50, 50]);
    const filtered = customThemes.filter(t => t.id !== id);
    setCustomThemes(filtered);
    localStorage.setItem('whatdoyouknow_custom_themes', JSON.stringify(filtered));

    const newSet = new Set(selectedIds);
    newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!themeName.trim()) {
      setErrorMsg('O nome do tema é obrigatório.');
      return;
    }

    const items = questionsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (items.length < 3) {
      setErrorMsg('Insira pelo menos 3 perguntas (uma por linha).');
      return;
    }

    const themeId = `custom_theme_${Date.now()}`;
    const newTheme: WhatDoYouKnowTheme = {
      id: themeId,
      name: themeName.trim(),
      description: themeDescription.trim() || 'Pacote personalizado criado por você.',
      color: 'bg-emerald-50 text-emerald-600',
      textColor: 'text-emerald-600',
      icon: HelpCircle,
      questions: items
    };

    const updatedThemes = [...customThemes, newTheme];
    setCustomThemes(updatedThemes);
    localStorage.setItem('whatdoyouknow_custom_themes', JSON.stringify(updatedThemes));

    const newSet = new Set(selectedIds);
    newSet.add(themeId);
    setSelectedIds(newSet);

    setThemeName('');
    setThemeDescription('');
    setQuestionsText('');
    setShowModal(false);
    triggerVibration(100);
  };

  const allThemes = [...dbThemes, ...customThemes];
  const selectedThemes = allThemes.filter(t => selectedIds.has(t.id));

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-slate-800 font-sans">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">O Que Você Sabe?</h1>
            <p className="text-xs text-slate-500 font-medium">Pacotes de perguntas sobre amigos</p>
          </div>
        </div>

        <TagChip label={`${selectedIds.size} selecionado(s)`} variant={selectedIds.size > 0 ? 'success' : 'neutral'} />
      </div>

      {/* Área Central Rolável */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-3.5 max-w-md mx-auto w-full"
        style={{ paddingBottom: 'max(8rem, calc(7rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {allThemes.map((theme) => {
          const isSelected = selectedIds.has(theme.id);
          const Icon = theme.icon;
          const isCustom = theme.id.startsWith('custom_theme_');

          return (
            <div
              key={theme.id}
              onClick={() => toggleTheme(theme.id)}
              className={`w-full group text-left relative overflow-hidden rounded-3xl p-5 shadow-card hover:shadow-soft transition-all duration-200 border-2 flex items-center gap-4 cursor-pointer bg-white ${
                isSelected 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 shadow-xs">
                <Icon size={24} />
              </div>
              <div className="flex-1 pr-2 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-base text-slate-800 truncate">{theme.name}</h3>
                  {isCustom && (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">{theme.description}</p>
                <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                  {theme.questions?.length ? `${theme.questions.length} perguntas` : 'Perguntas temáticas'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {isCustom && (
                  <button
                    onClick={(e) => handleDeleteTheme(theme.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Excluir tema"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                }`}>
                  {isSelected && <Check size={14} className="text-white stroke-[3px]" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão para Criar Tema */}
        <button
          onClick={() => { setShowModal(true); triggerVibration(50); }}
          className="w-full p-4 rounded-3xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50 text-center text-emerald-700 font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-xs mt-2"
        >
          <Plus size={18} />
          <span>Criar Pacote de Perguntas Personalizado</span>
        </button>
      </div>

      {/* Rodapé Fixo */}
      <div 
        className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-bottom"
        style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={() => onStart(selectedThemes)}
            disabled={selectedThemes.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base py-4 rounded-full shadow-[0_8px_20px_rgba(5,150,105,0.25)] disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Iniciar Partida</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Modal para Criação de Tema Customizado */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-t-[32px] sm:rounded-[32px] p-6 max-w-sm w-full mx-auto shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 z-10"
            >
              <X size={20} />
            </button>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-800">Novo Pacote de Perguntas</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Crie perguntas divertidas sobre o seu grupo.</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold mb-4 text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTheme} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nome do Pacote</label>
                <input
                  type="text"
                  placeholder="Ex: Perguntas da Galera"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value.slice(0, 24))}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Apenas histórias secretas..."
                  value={themeDescription}
                  onChange={(e) => setThemeDescription(e.target.value.slice(0, 60))}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Perguntas (uma por linha, mín. 3)</label>
                <textarea
                  placeholder="Ex:&#10;Quem daqui gasta mais dinheiro com besteira?&#10;Qual seria o primeiro item que eu salvaria de um incêndio?&#10;Quem do grupo sobreviveria a um apocalipse zumbi?"
                  value={questionsText}
                  onChange={(e) => setQuestionsText(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 text-sm resize-none font-sans"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-sm"
                >
                  Salvar Pacote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
