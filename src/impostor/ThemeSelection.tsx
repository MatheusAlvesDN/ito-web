import { useState, useEffect } from 'react';
import { ChevronLeft, Check, Ghost, Plus, Trash2, X, Sparkles, Key, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import type { Theme, ImpostorScenario } from '../types/game';
import { triggerVibration } from '../utils/syncService';
import { generateImpostorTheme } from '../utils/geminiService';
import { toast } from 'sonner';
import { TagChip } from '../components/common/TagChip';

type Props = {
  onBack: () => void;
  onStart: (themes: Theme[]) => void;
};

export default function ThemeSelectionImpostor({ onBack, onStart }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dbThemes, setDbThemes] = useState<Theme[]>([]);
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.getThemes('impostor').then((loaded) => {
      setDbThemes(loaded);
      if (loaded.length > 0) {
        setSelectedIds([loaded[0].id]);
      }
    }).catch(console.error);
  }, []);

  // Form States
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  
  // Single Scenario Draft
  const [honestText, setHonestText] = useState('');
  const [impostorText, setImpostorText] = useState('');
  const [scenariosList, setScenariosList] = useState<ImpostorScenario[]>([]);
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
      const generated = await generateImpostorTheme(aiPrompt.trim(), apiKey.trim());
      
      if (generated.name) setThemeName(generated.name);
      if (generated.description) setThemeDescription(generated.description);
      if (generated.scenarios && generated.scenarios.length > 0) {
        setScenariosList(generated.scenarios);
        setActiveTab('manual');
        toast.success(`Tema "${generated.name}" gerado com sucesso!`);
      } else {
        setErrorMsg('A IA não retornou cenários válidos. Tente novamente com outro prompt.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar tema com IA. Verifique sua chave API.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ito_custom_impostor_themes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mapped = parsed.map((t: any) => ({
          ...t,
          icon: Ghost,
          color: t.color || 'bg-purple-50',
          textColor: t.textColor || 'text-purple-600',
        }));
        setCustomThemes(mapped);
      } catch (e) {
        console.error('Falha ao carregar temas customizados', e);
      }
    }
  }, []);

  const toggleTheme = (id: string) => {
    triggerVibration(50);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((tid) => tid !== id);
      return [...prev, id];
    });
  };

  const handleDeleteTheme = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customThemes.filter((t) => t.id !== id);
    setCustomThemes(updated);
    setSelectedIds(selectedIds.filter((tid) => tid !== id));
    localStorage.setItem('ito_custom_impostor_themes', JSON.stringify(updated));
    localStorage.removeItem('impostor_custom_scenarios_' + id);
    triggerVibration(100);
    toast.info('Tema excluído com sucesso');
  };

  const handleAddScenario = () => {
    if (!honestText.trim()) {
      setErrorMsg('A palavra do grupo honesto não pode estar vazia.');
      return;
    }
    const impostors = impostorText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (impostors.length === 0) {
      setErrorMsg('Adicione pelo menos uma palavra para o Impostor.');
      return;
    }

    setScenariosList([
      ...scenariosList,
      {
        honest: honestText.trim(),
        impostorVariations: impostors,
      },
    ]);

    setHonestText('');
    setImpostorText('');
    setErrorMsg('');
    triggerVibration(50);
  };

  const handleCreateTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeName.trim()) {
      setErrorMsg('O nome do tema é obrigatório.');
      return;
    }

    if (scenariosList.length === 0) {
      setErrorMsg('Adicione pelo menos um cenário com palavras antes de salvar.');
      return;
    }

    const themeId = `custom_theme_${Date.now()}`;
    const newTheme: Theme = {
      id: themeId,
      name: themeName.trim(),
      description: themeDescription.trim() || 'Tema customizado criado por você',
      icon: Ghost,
      color: 'bg-purple-50',
      textColor: 'text-purple-600',
    };

    const updated = [...customThemes, newTheme];
    setCustomThemes(updated);
    localStorage.setItem('ito_custom_impostor_themes', JSON.stringify(updated));
    localStorage.setItem('impostor_custom_scenarios_' + themeId, JSON.stringify(scenariosList));

    setSelectedIds([...selectedIds, themeId]);

    setThemeName('');
    setThemeDescription('');
    setHonestText('');
    setImpostorText('');
    setScenariosList([]);
    setShowModal(false);
    triggerVibration(100);
    toast.success('Novo tema salvo!');
  };

  const allThemes = [...dbThemes, ...customThemes];
  const selectedThemes = allThemes.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-slate-800 font-sans">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-purple-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">Temas do Impostor</h1>
            <p className="text-xs text-slate-500 font-medium">Selecione os pacotes de palavras</p>
          </div>
        </div>

        <TagChip label={`${selectedIds.length} selecionado(s)`} variant={selectedIds.length > 0 ? 'primary' : 'neutral'} />
      </div>

      {/* Área Central Rolável */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-3.5 max-w-md mx-auto w-full"
        style={{ paddingBottom: 'max(8rem, calc(7rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {allThemes.map((theme) => {
          if (theme.id === 'free') return null;
          
          const Icon = theme.icon;
          const isSelected = selectedIds.includes(theme.id);
          const isCustom = theme.id.startsWith('custom_theme_');

          return (
            <div
              key={theme.id}
              onClick={() => toggleTheme(theme.id)}
              className={`w-full group text-left relative overflow-hidden rounded-3xl p-5 shadow-card hover:shadow-soft transition-all duration-200 border-2 flex items-center gap-4 cursor-pointer bg-white ${
                isSelected 
                  ? 'border-purple-500 ring-2 ring-purple-500/20' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 shadow-xs shrink-0">
                <Icon size={24} />
              </div>
              <div className="flex-1 pr-2 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-base text-slate-800 truncate">{theme.name}</h3>
                  {isCustom && (
                    <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-slate-500 font-medium text-xs leading-relaxed line-clamp-2">{theme.description}</p>
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
                
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                  {isSelected && <Check size={14} className="text-white stroke-[3px]" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão de Novo Tema */}
        <button
          onClick={() => { setShowModal(true); triggerVibration(50); }}
          className="w-full p-4 rounded-3xl border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50 text-center text-purple-700 font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-xs mt-2"
        >
          <Plus size={18} />
          <span>Criar Tema Personalizado ou com IA</span>
        </button>
      </div>

      {/* Rodapé Fixo Flex com Safe Area */}
      <div 
        className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-bottom"
        style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={() => onStart(selectedThemes)}
            disabled={selectedIds.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base py-4 rounded-full shadow-[0_8px_20px_rgba(147,51,234,0.25)] disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
              <X size={18} />
            </button>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-800">Novo Tema (Impostor)</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Adicione pares de palavras para desafiar o grupo.</p>
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
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${activeTab === 'manual' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                disabled={isGenerating}
              >
                ✍️ Manual
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('ai'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
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
                    className="text-xs font-bold text-purple-600 hover:text-purple-700"
                  >
                    {showApiKeyInput ? 'Ocultar' : 'Alterar'}
                  </button>
                </div>

                {showApiKeyInput && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sua Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="Cole sua chave aqui (AIza...)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-mono placeholder:text-slate-400 outline-none focus:border-purple-500 text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Salva com segurança no seu navegador.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Sobre o que é o tema?</label>
                  <textarea
                    placeholder="Ex: Palavras de filmes clássicos, marcas de tecnologia, comidas típicas..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-purple-500 text-sm resize-none"
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
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white font-bold rounded-full text-xs shadow-sm flex items-center justify-center gap-1.5"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nome do Tema</label>
                  <input
                    type="text"
                    placeholder="Ex: Segredos da Galera"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value.slice(0, 24))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-purple-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Para quem viajou junto..."
                    value={themeDescription}
                    onChange={(e) => setThemeDescription(e.target.value.slice(0, 60))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:border-purple-500 text-sm"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <span className="block text-xs font-bold text-purple-700 uppercase tracking-wide">
                    Adicionar Palavras ({scenariosList.length} prontas)
                  </span>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Palavra dos Honestos</label>
                    <input
                      type="text"
                      placeholder="Ex: Cachorro"
                      value={honestText}
                      onChange={(e) => setHonestText(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Palavras do Impostor (uma por linha)</label>
                    <textarea
                      placeholder="Ex:&#10;Lobo&#10;Gato&#10;Leão"
                      value={impostorText}
                      onChange={(e) => setImpostorText(e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 text-xs font-medium resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddScenario}
                    className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-xl text-xs"
                  >
                    + Adicionar Par de Palavras
                  </button>
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
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full text-xs shadow-sm"
                  >
                    Salvar Tema
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