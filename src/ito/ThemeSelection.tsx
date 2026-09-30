import { useState, useEffect } from 'react';
import { ChevronLeft, Check, Settings as SettingsIcon, Info } from 'lucide-react';
import { THEMES, type Theme } from './data';
import { triggerVibration } from '../utils/syncService';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Stepper } from '../components/common/Stepper';
import { TagChip } from '../components/common/TagChip';

type Props = {
  onBack: () => void;
  onStart: (
    themes: Theme[],
    saboteurMode: boolean,
    config: {
      connectionMode: 'local' | 'online';
      scale: number;
      timeLimit: number;
      lives: number;
    }
  ) => void;
};

export default function ThemeSelectionClassic({ onBack, onStart }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(['free', 'food']);
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [saboteurMode] = useState(false);

  const [connectionMode, setConnectionMode] = useState<'local' | 'online'>('local');
  const [scale, setScale] = useState<50 | 100 | 1000>(100);
  const [timeLimit, setTimeLimit] = useState<0 | 2 | 5>(3 as any); // using 3 to map to 5 conceptually, but let's stick to 2/5/0
  const [lives, setLives] = useState(3);

  useEffect(() => {
    // Normalizar tempo inicial
    setTimeLimit(0);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ito_custom_themes');
    if (saved) {
      try {
        setCustomThemes(JSON.parse(saved));
      } catch (err) {}
    }
  }, []);

  const toggleTheme = (id: string) => {
    triggerVibration(50);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((tid) => tid !== id);
      return [...prev, id];
    });
  };

  const allThemes = [...THEMES, ...customThemes];
  const selectedThemes = allThemes.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-party-dark font-sans">
      
      {/* Header Minimalista */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 backdrop-blur-xl sticky top-0 z-20 safe-top shrink-0 border-b border-slate-200/50">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-lg text-slate-800">Configurar Jogo</h2>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
          <SettingsIcon size={20} className="text-slate-600" />
        </button>
      </div>

      <div 
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'max(8rem, calc(7rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        
        {/* Game Identity Card */}
        <div className="px-6 pt-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-blue-100 flex flex-col items-center justify-center shrink-0">
               <span className="text-xs font-black leading-none text-party-blue">1 2 3</span>
               <span className="text-[10px] font-bold mt-1 text-party-blue">ITO</span>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="font-bold text-[17px] text-slate-800">Ito Clássico</h3>
               <p className="text-xs font-medium text-slate-500 mb-2">Criador da sala: Você</p>
               <TagChip label="Sala #4920" variant="primary" />
            </div>
          </div>
        </div>

        {/* 1. Modo de Conexão */}
        <div className="px-6 mb-8">
           <h3 className="text-base font-bold text-slate-800 mb-3 ml-1">1. Modo de Conexão</h3>
           <SegmentedControl
              options={[
                { value: 'local', label: '📱 Local' },
                { value: 'online', label: '🌐 Online' }
              ]}
              value={connectionMode}
              onChange={(val) => setConnectionMode(val)}
           />
           <div className="mt-3 flex items-start gap-2 bg-blue-50/50 border border-blue-100/50 p-3 rounded-2xl">
              <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-blue-700/80 leading-relaxed">
                {connectionMode === 'local' 
                  ? 'No modo local, todos jogam no mesmo aparelho. Passem o celular de mão em mão!'
                  : 'No modo online, cada jogador usa o seu celular.'}
              </p>
           </div>
        </div>

        {/* 2. Temas */}
        <div className="px-6 mb-8">
           <div className="flex justify-between items-center mb-3 ml-1">
              <h3 className="text-base font-bold text-slate-800">2. Escolha dos Temas</h3>
              <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100">
                {selectedIds.length} selecionado{selectedIds.length !== 1 && 's'}
              </span>
           </div>

           <div className="flex flex-col gap-3">
             {THEMES.map((theme, index) => {
               const isSelected = selectedIds.includes(theme.id);
               // Mock difficulties based on theme
               const difficulty = index % 3 === 0 ? 'Fácil' : index % 3 === 1 ? 'Médio' : 'Difícil';
               const variant = difficulty === 'Fácil' ? 'success' : difficulty === 'Médio' ? 'warning' : 'danger';
               
               return (
                 <div 
                   key={theme.id}
                   onClick={() => toggleTheme(theme.id)}
                   className={`bg-white rounded-3xl p-4 flex gap-4 cursor-pointer transition-all shadow-card border ${isSelected ? 'border-party-blue ring-1 ring-party-blue/20' : 'border-slate-100'}`}
                 >
                    <div className="pt-1">
                       <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors border ${isSelected ? 'bg-party-blue border-party-blue text-white' : 'border-slate-300 bg-slate-50'}`}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                       </div>
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-[15px] text-slate-800">{theme.name}</h4>
                          <TagChip label={difficulty} variant={variant} />
                       </div>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                          {theme.description}
                       </p>
                       <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                         <p className="text-[10px] font-bold text-slate-500 italic">
                            <span className="text-party-blue">Exemplo:</span> 1 = Muito ruim, 100 = Muito bom
                         </p>
                       </div>
                    </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* 3. Configurações da Partida */}
        <div className="px-6 mb-8">
           <h3 className="text-base font-bold text-slate-800 mb-4 ml-1">3. Configuração da Partida</h3>
           
           <div className="bg-white rounded-[2rem] p-5 shadow-card border border-slate-100 flex flex-col gap-6">
              
              {/* Escala */}
              <div>
                <h4 className="font-bold text-sm text-slate-700 mb-3">Escala de Números da Rodada</h4>
                <SegmentedControl
                  options={[
                    { value: 50, label: '1-50' },
                    { value: 100, label: '1-100 (Padrão)' },
                    { value: 1000, label: '1-1000 (Insano)' }
                  ]}
                  value={scale}
                  onChange={(val) => setScale(val)}
                />
              </div>

              {/* Tempo */}
              <div>
                <h4 className="font-bold text-sm text-slate-700 mb-3">Tempo de Discussão</h4>
                <SegmentedControl
                  options={[
                    { value: 0, label: 'Sem limite' },
                    { value: 2, label: '2 Min' },
                    { value: 5, label: '5 Min' }
                  ]}
                  value={timeLimit}
                  onChange={(val) => setTimeLimit(val)}
                />
              </div>

              {/* Vidas */}
              <div className="pt-2 border-t border-slate-100">
                 <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-700">Vidas da Equipe</h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{lives} vida{lives !== 1 && 's'} padrão</p>
                    </div>
                    <Stepper 
                      value={lives}
                      onChange={setLives}
                      min={1}
                      max={5}
                    />
                 </div>
              </div>

           </div>
        </div>

        <div className="px-6 mb-8">
           <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-xs text-amber-800/80 font-medium leading-relaxed">
                <strong className="text-amber-800">Dica Rápida:</strong> Em partidas com 6+ jogadores, recomendamos usar a escala 1-1000 para evitar números repetidos.
              </p>
           </div>
        </div>

      </div>

      <div 
        className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-bottom"
        style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
         <button
           onClick={() => onStart(selectedThemes, saboteurMode, { connectionMode, scale, timeLimit, lives })}
           disabled={selectedIds.length === 0}
           className="w-full bg-party-blue hover:bg-blue-700 text-white font-bold text-base py-4 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
         >
           Avançar para Jogadores ➔
         </button>
      </div>

    </div>
  );
}