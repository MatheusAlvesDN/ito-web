import { Gamepad2, Users, Trophy, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'play' | 'rooms' | 'challenges' | 'profile';
  onChange: (tab: 'play' | 'rooms' | 'challenges' | 'profile') => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: 'play', icon: Gamepad2, label: 'Jogar' },
    { id: 'rooms', icon: Users, label: 'Salas' },
    { id: 'challenges', icon: Trophy, label: 'Desafios' },
    { id: 'profile', icon: User, label: 'Perfil' }
  ] as const;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 px-4 pt-2 pointer-events-none z-50 pb-safe"
      style={{ paddingBottom: 'max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
    >
      <div className="max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-white/40 shadow-soft rounded-3xl p-2 flex items-center justify-between pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-party-blue/10 text-party-blue' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon 
                className={`w-6 h-6 mb-1 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
