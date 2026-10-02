import { useState } from 'react';
import { Search, SlidersHorizontal, ChevronRight, Clock, Users, Ghost, ScanFace, FileQuestion, Share2 } from 'lucide-react';
import { AppHeader } from '../components/common/AppHeader';
import { BottomNav } from '../components/common/BottomNav';
import { TagChip } from '../components/common/TagChip';
import { AvatarPickerModal } from '../components/common/AvatarPickerModal';
import { getPlayerAvatar, savePlayerAvatar } from '../utils/avatarService';

interface Props {
  onSelectClassic: () => void;
  onSelectImpostor: () => void;
  onSelectWhoAmI: () => void;
  onSelectWhatDoYouKnow: () => void;
  onSelectTranslator?: () => void;
}

export function HomeScreen({
  onSelectClassic,
  onSelectImpostor,
  onSelectWhoAmI,
  onSelectWhatDoYouKnow,
}: Props) {
  const [activeTab, setActiveTab] = useState<'play' | 'rooms' | 'challenges' | 'profile'>('play');
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('ito_user_avatar') || localStorage.getItem('ito_player_avatar') || getPlayerAvatar('Lucas');
  });
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const handleSaveAvatar = (newAvatar: string) => {
    setUserAvatar(newAvatar);
    localStorage.setItem('ito_user_avatar', newAvatar);
    localStorage.setItem('ito_player_avatar', newAvatar);
    savePlayerAvatar('Lucas', newAvatar);
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[#F5F7FB] text-party-dark w-full h-full overflow-y-auto relative"
      style={{ paddingBottom: 'max(8rem, calc(7rem + env(safe-area-inset-bottom, 0px)))' }}
    >
      <AppHeader 
        userName="Lucas" 
        userAvatar={userAvatar}
        onAvatarClick={() => setIsAvatarModalOpen(true)}
        coins={1250} 
        hasNotifications={true} 
      />

      <div className="px-6 mt-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full flex items-center px-4 py-3.5 shadow-sm border border-slate-100">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Procurar um jogo ou tema..."
              className="bg-transparent border-none outline-none flex-1 ml-3 text-sm font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 hover:text-party-blue transition-colors shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-soft">
          <div className="absolute -right-4 -top-8 opacity-10 pointer-events-none">
            <span className="text-[140px] font-black leading-none">∞</span>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-5 shadow-sm">
            Destaque da Semana
          </div>

          <h2 className="text-2xl font-black mb-2 leading-tight max-w-[85%]">
            Ito Clássico — A Escala Secreta
          </h2>
          <p className="text-blue-100 text-sm mb-6 max-w-[90%] font-medium leading-relaxed">
            Alinhem os números sem falar diretamente quais são eles!
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-black/10 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              👥 4-8 jogadores
            </span>
            <span className="bg-black/10 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              ⏱️ 15-20m
            </span>
            <span className="bg-black/10 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              ⭐ Fácil de Jogar
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSelectClassic}
              className="flex-1 bg-party-orange hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wide py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_4px_14px_0_rgba(249,115,22,0.39)]"
            >
              Jogar Agora <ChevronRight className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 shrink-0 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors active:scale-95">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Game List */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800">Salas para se Juntar</h3>
          <button className="text-party-blue text-sm font-bold hover:text-blue-700 transition-colors">
            Ver tudo &gt;
          </button>
        </div>

        <div className="flex flex-col gap-3">

          <div onClick={onSelectClassic} className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-card cursor-pointer hover:shadow-soft transition-shadow border border-slate-100">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex flex-col items-center justify-center shrink-0">
              <span className="text-xs font-black leading-none">1 2 3</span>
              <span className="text-[9px] font-bold mt-1 uppercase">ITO</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-base truncate">Ito Clássico - Sala dos Cria</h4>
              <p className="text-slate-500 text-xs truncate font-medium mb-2">Criado por @savio.bez</p>
              <div className="flex items-center gap-2">
                <TagChip label="4/8" icon={<Users className="w-3 h-3" />} variant="neutral" />
                <TagChip label="Começando em 01:24" icon={<Clock className="w-3 h-3" />} variant="warning" />
                <TagChip label="Na fila" variant="success" />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          <div onClick={onSelectWhoAmI} className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-card cursor-pointer hover:shadow-soft transition-shadow border border-slate-100">
            <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
              <ScanFace size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-base truncate">Quem Sou Eu? - Famosos</h4>
              <p className="text-slate-500 text-xs truncate font-medium mb-2">Criado por @pipootaku</p>
              <div className="flex items-center gap-2">
                <TagChip label="6/8" icon={<Users className="w-3 h-3" />} variant="neutral" />
                <TagChip label="Em breve" variant="warning" />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          <div onClick={onSelectImpostor} className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-card cursor-pointer hover:shadow-soft transition-shadow border border-slate-100">
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
              <Ghost size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-base truncate">O Impostor - Edição Geek</h4>
              <p className="text-slate-500 text-xs truncate font-medium mb-2">Criado por @josa_amigo</p>
              <div className="flex items-center gap-2">
                <TagChip label="5/7" icon={<Users className="w-3 h-3" />} variant="neutral" />
                <TagChip label="Na fila" variant="success" />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          <div onClick={onSelectWhatDoYouKnow} className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-card cursor-pointer hover:shadow-soft transition-shadow border border-slate-100">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
              <FileQuestion size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-base truncate">O que Você Sabe?</h4>
              <p className="text-slate-500 text-xs truncate font-medium mb-2">Criado por @lana_del_rey_1999</p>
              <div className="flex items-center gap-2">
                <TagChip label="3/6" icon={<Users className="w-3 h-3" />} variant="neutral" />
                <TagChip label="Na fila" variant="success" />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

        </div>
      </div>

      <div className="px-6 mb-8">
        <div className="bg-slate-800 rounded-[2rem] p-5 text-white flex items-center justify-between shadow-soft overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h3 className="font-bold text-lg">Turbine suas noites de jogos</h3>
            <p className="text-slate-400 text-sm mt-1">Desbloqueie skins e temas VIP.</p>
          </div>
          <button className="relative z-10 bg-white text-slate-800 text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-sm hover:bg-slate-50 transition-colors">
            Ver mais
          </button>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={userAvatar}
        playerName="Lucas"
        onSave={handleSaveAvatar}
      />
    </div>
  );
}
