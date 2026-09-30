import { Bell } from 'lucide-react';

interface AppHeaderProps {
  userName: string;
  coins?: number;
  hasNotifications?: boolean;
}

export function AppHeader({ userName, coins = 1250, hasNotifications = true }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-transparent pt-safe">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm border border-slate-100 flex-shrink-0">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} 
            alt="Avatar" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            E aí, {userName}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-slate-500 font-medium line-clamp-1">Pronto para jogar?</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 whitespace-nowrap">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">12 online</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          <span className="text-lg leading-none">🪙</span>
          <span className="font-bold text-slate-700 text-sm">{coins}</span>
        </div>
        <button className="relative p-2.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-party-blue transition-colors flex-shrink-0">
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      </div>
    </div>
  );
}
