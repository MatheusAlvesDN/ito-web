import { ChevronLeft, Ghost, ScanFace, FileQuestion, RefreshCw, ChevronRight } from 'lucide-react';
import { TagChip } from '../components/common/TagChip';

interface Props {
  onBack: () => void;
  onSelectClassic: () => void;
  onSelectImpostor: () => void;
  onSelectWhoAmI: () => void;
  onSelectWhatDoYouKnow: () => void;
  onSelectTranslator: () => void;
}

export function ModeSelectionScreen({
  onBack,
  onSelectClassic,
  onSelectImpostor,
  onSelectWhoAmI,
  onSelectWhatDoYouKnow,
  onSelectTranslator,
}: Props) {
  const modes = [
    {
      id: 'classic',
      title: 'ITO Clássico',
      subtitle: 'A Escala Secreta',
      description: 'Cooperação total. Alinhem os números secretos em ordem crescente sem falar o valor direto!',
      badge: 'Coop',
      badgeVariant: 'primary' as const,
      players: '2-8 jogadores',
      iconBg: 'bg-blue-50 text-party-blue border-blue-100',
      action: onSelectClassic,
      customIcon: (
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs font-black leading-none">1 2 3</span>
          <span className="text-[8px] font-bold mt-0.5">ITO</span>
        </div>
      ),
    },
    {
      id: 'impostor',
      title: 'O Impostor',
      subtitle: 'Edição Geek & Geral',
      description: 'Um traidor entre nós. Todos recebem o mesmo tema secreto, exceto o Impostor. Descubra quem está blefando!',
      badge: 'Bluff / Blefe',
      badgeVariant: 'neutral' as const,
      players: '3-10 jogadores',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      action: onSelectImpostor,
      customIcon: <Ghost size={24} />,
    },
    {
      id: 'whoami',
      title: 'Quem Sou Eu?',
      subtitle: 'Famosos & Personagens',
      description: 'Coloque o celular na testa! Faça perguntas e tente adivinhar quem é seu próprio personagem.',
      badge: 'Casual',
      badgeVariant: 'warning' as const,
      players: '2+ jogadores',
      iconBg: 'bg-orange-50 text-orange-500 border-orange-100',
      action: onSelectWhoAmI,
      customIcon: <ScanFace size={24} />,
    },
    {
      id: 'whatdoyouknow',
      title: 'O Que Você Sabe?',
      subtitle: 'Quiz de Amigos',
      description: 'Você conhece seus amigos? Alguém responde uma pergunta secreta e o grupo tenta adivinhar o que ele respondeu!',
      badge: 'Party Quiz',
      badgeVariant: 'success' as const,
      players: '3+ jogadores',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      action: onSelectWhatDoYouKnow,
      customIcon: <FileQuestion size={24} />,
    },
    {
      id: 'translator',
      title: 'Lab de Tradução',
      subtitle: 'Telefone Sem Fio',
      description: 'Passe uma frase por múltiplos idiomas ao redor do mundo e veja a hilária distorção no resultado final!',
      badge: 'Experimental',
      badgeVariant: 'neutral' as const,
      players: 'Solo ou Grupo',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      action: onSelectTranslator,
      customIcon: <RefreshCw size={22} />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F5F7FB] relative h-full overflow-hidden text-slate-800 font-sans">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-[#F5F7FB]/90 border-b border-slate-200/50 backdrop-blur-xl sticky top-0 z-20 pt-safe shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-party-blue hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">Escolha o Modo</h1>
            <p className="text-xs text-slate-500 font-medium">Qual a vibe do jogo hoje?</p>
          </div>
        </div>
      </div>

      {/* Conteúdo Rolável */}
      <div 
        className="flex-1 p-6 flex flex-col gap-4 max-w-md mx-auto w-full overflow-y-auto"
        style={{ paddingBottom: 'max(4rem, calc(2rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {modes.map((mode, index) => (
          <button
            key={mode.id}
            onClick={mode.action}
            className="group relative w-full bg-white p-5 rounded-3xl border border-slate-100 hover:border-party-blue/30 shadow-card hover:shadow-soft transition-all duration-200 transform active:scale-[0.98] text-left animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${mode.iconBg}`}>
                {mode.customIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-bold text-slate-800 text-base leading-snug">{mode.title}</h2>
                  <TagChip label={mode.badge} variant={mode.badgeVariant} />
                </div>
                <p className="text-slate-400 text-xs font-semibold mb-1.5">{mode.subtitle} • {mode.players}</p>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  {mode.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-party-blue transition-colors shrink-0 self-center" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
