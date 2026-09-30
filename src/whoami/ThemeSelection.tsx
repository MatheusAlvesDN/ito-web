import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, X, Sparkles, Key, ScanFace, ArrowRight, Check } from 'lucide-react';
import { WHOAMI_THEMES, type WhoAmITheme } from './data';
import { triggerVibration } from '../utils/syncService';
import { generateWhoAmITheme } from '../utils/geminiService';
import { toast } from 'sonner';
import { TagChip } from '../components/common/TagChip';

interface Props {
  onBack: () => void;
  onStart: (themes: WhoAmITheme[]) => void;
}

export default function ThemeSelectionWhoAmI({ onBack, onStart }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(['celebrities']));
  const [customThemes, setCustomThemes] = useState<WhoAmITheme[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [personalitiesText, setPersonalitiesText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // AI Generation States
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ito_gemini_api_key') || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(() => !localStorage.getItem('ito_gemini_api_key'));

  const handleGenerateWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!apiKey.trim()) {
      setErrorMsg('Insira uma chave de API do Gemini para prosseguir.');
      return;
    }

    if (!aiPrompt.trim()) {
      setErrorMsg('Descreva sobre o que você deseja que o tema seja.');
      return;
    }

    setIsGenerating(true);
    triggerVibration(100);
    
    localStorage.setItem('ito_gemini_api_key', apiKey.trim());
    setShowApiKeyInput(false);

    try {
      const generated = await generateWhoAmITheme(aiPrompt.trim(), apiKey.trim());
      
      if (generated.name) setThemeName(generated.name);
      if (generated.description) setThemeDescription(generated.description);
      if (generated.personalities && generated.personalities.length > 0) {
        setPersonalitiesText(generated.personalities.join('\n'));
        setActiveTab('manual');
        toast.success(`Tema "${generated.name}" gerado com sucesso!`);
      } else {
        setErrorMsg('A IA não retornou personalidades válidas. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar tema com IA. Verifique sua chave API.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('whoami_custom_themes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mapped = parsed.map((t: any) => ({
          ...t,
          icon: ScanFace,
          color: t.color || 'bg-orange-50',
          textColor: t.textColor || 'text-orange-500',
        }));
        setCustomThemes(mapped);
      } catch (e) {
        console.error('Falha ao carregar temas salvos', e);
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
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    localStorage.setItem('whoami_custom_themes', JSON.stringify(updated));
    const newSet = new Set(selectedIds);
    newSet.delete(id);
    setSelectedIds(newSet);
    triggerVibration(100);
    toast.info('Tema excluído com sucesso');
  };

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeName.trim()) {
      setErrorMsg('O nome do tema é obrigatório.');
      return;
    }
    const personalities = personalitiesText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (personalities.length < 5) {
      setErrorMsg('Adicione pelo menos 5 personalidades (uma por linha).');
      return;
    }

    const themeId = `custom_theme_${Date.now()}`;
    const newTheme: WhoAmITheme = {
      id: themeId,
      name: themeName.trim(),
      description: themeDescription.trim() || 'Tema customizado criado por você',
      personalities,
      icon: ScanFace,
      color: 'bg-orange-50',
      textColor: 'text-orange-500',
    };
    
    const updatedThemes = [...customThemes, newTheme];
    setCustomThemes(updatedThemes);
    localStorage.setItem('whoami_custom_themes', JSON.stringify(updatedThemes));

    const newSet = new Set(selectedIds);
    newSet.add(themeId);
    setSelectedIds(newSet);

    setThemeName('');
    setThemeDescription('');
    setPersonalitiesText('');
    setShowModal(false);
    triggerVibration(100);
    toast.success('Novo tema criado!');
  };

  const allThemes = [...WHOAMI_THEMES, ...customThemes];
  const selectedThemes = allThemes.filter(t => selectedIds.has(t.id));

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-slate-800 font-sans">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-orange-500 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">Quem Sou Eu?</h1>
            <p className="text-xs text-slate-500 font-medium">Categorias de personagens</p>
          </div>
        </div>

        <TagChip label={`${selectedIds.size} selecionado(s)`} variant={selectedIds.size > 0 ? 'warning' : 'neutral'} />
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
                  ? 'border-orange-500 ring-2 ring-orange-500/20' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-orange-50 text-orange-500 shadow-xs">
                <Icon size={24} />
              </div>
              <div className="flex-1 pr-2 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-base text-slate-800 truncate">{theme.name}</h3>
                  {isCustom && (
                    <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">{theme.description}</p>
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
                  isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'
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
          className="w-full p-4 rounded-3xl border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/30 hover:bg-orange-50 text-center text-orange-700 font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-xs mt-2"
        >
          <Plus size={18} />
          <span>Criar Categoria Personalizada ou com IA</span>
        </button>
      </div>

      {/* Rodapé Fixo com Safe Area */}
      <div 
        className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-bottom"
        style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={() => onStart(selectedThemes)}
            disabled={selectedThemes.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base py-4 rounded-full shadow-[0_8px_20px_rgba(249,115,22,0.25)] disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
              <h3 className="text-xl font-bold text-slate-800">Nova Categoria</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Crie seus próprios personagens para adivinhar.</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold mb-4 text-center">
                {errorMsg}
              </div>
            )}

            {/* Abas */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => { setActiveTab('manual'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                disabled={isGenerating}
              >
                ✍️ Manual
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('ai'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                disabled={isGenerating}
              >
                <Sparkles size={14} /> Gerar com IA
              </button>
            </div>

            {activeTab === 'ai' ? (
              <form onSubmit={handleGenerateWithAI} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Key size={12} /> Chave do Gemini
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    {showApiKeyInput ? 'Ocultar' : 'Alterar'}
                  </button>
                </div>

                {showApiKeyInput && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sua Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="Cole sua API Key aqui (AIza...)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-mono placeholder:text-slate-400 outline-none focus:border-orange-500 text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Salva com segurança no seu navegador.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Qual o tema dos personagens?</label>
                  <textarea
                    placeholder="Ex: Personagens de ficção científica, deuses gregos, animais pré-históricos, atores de Hollywood..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 text-sm resize-none"
                    disabled={isGenerating}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs"
                    disabled={isGenerating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-bold rounded-full text-xs shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Gerar Tema</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTheme} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nome da Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Personagens de Anime"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value.slice(0, 24))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Apenas animes famosos..."
                    value={themeDescription}
                    onChange={(e) => setThemeDescription(e.target.value.slice(0, 60))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Personagens (um por linha)</label>
                  <textarea
                    placeholder="Ex:&#10;Goku&#10;Naruto&#10;Luffy&#10;Pikachu&#10;Sailor Moon"
                    value={personalitiesText}
                    onChange={(e) => setPersonalitiesText(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 text-sm resize-none font-sans"
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
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full text-xs shadow-sm"
                  >
                    Salvar Categoria
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
