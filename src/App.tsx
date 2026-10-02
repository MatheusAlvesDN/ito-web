import React, { Suspense, useEffect, useReducer, useState } from 'react';
import { RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { THEMES } from './data';
import { syncService } from './utils/syncService';
import { Toaster } from 'sonner';
import { audioService } from './utils/audioService';

// --- IMPORTS DOS COMPONENTES ---
import ThemeSelectionClassic from './ito/ThemeSelection';
import ThemeSelectionImpostor from './impostor/ThemeSelection';
import ThemeSelectionWhoAmI from './whoami/ThemeSelection';
import ThemeSelectionWhatDoYouKnow from './whatdoyouknow/ThemeSelection';
import TranslatorScreen from './translator/TranslatorScreen';
import { PlayerRegistrationScreen } from './components/common/PlayerRegistrationScreen';
import { SyncWaitingScreen } from './components/common/SyncWaitingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ModeSelectionScreen } from './screens/ModeSelectionScreen';

// Lazy load para as telas de jogos
const GameScreenIto = React.lazy(() => import('./ito/GameScreen'));
const GameScreenImpostor = React.lazy(() => import('./impostor/GameScreen'));
const GameScreenWhoAmI = React.lazy(() => import('./whoami/GameScreen'));
const GameScreenWhatDoYouKnow = React.lazy(() => import('./whatdoyouknow/GameScreen'));

// --- LOBBY COMPONENTS ---
import { ConnectionSelectionScreen } from './components/lobby/ConnectionSelectionScreen';
import { LobbySetupScreen } from './components/lobby/LobbySetupScreen';
import { MultiplayerLobbyScreen } from './components/lobby/MultiplayerLobbyScreen';

// --- HOOKS ---
import { useMultiplayerSync } from './hooks/useMultiplayerSync';

// --- TIPOS ---
export type GameMode = 'classic' | 'impostor' | 'whoami' | 'whatdoyouknow' | 'translator';

// Telas
type Screen =
  | 'home'
  | 'mode-selection'
  | 'connection-selection'
  | 'lobby-setup'
  | 'multiplayer-lobby'
  | 'register-classic'
  | 'register-impostor'
  | 'theme-classic'
  | 'theme-impostor'
  | 'game-classic'
  | 'game-impostor'
  | 'register-whoami'
  | 'theme-whoami'
  | 'game-whoami'
  | 'register-whatdoyouknow'
  | 'theme-whatdoyouknow'
  | 'game-whatdoyouknow'
  | 'translator-chain';

type State = {
  screen: Screen;
  gameMode: GameMode;
  players: string[];
  themes: any[];
  saboteurMode?: boolean;
  gameConfig?: {
    connectionMode: 'local' | 'online';
    scale: number;
    timeLimit: number;
    lives: number;
  };
};

type Action =
  | { type: 'GO_HOME' }
  | { type: 'GO_MODE_SELECTION' }
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_GAME_MODE'; gameMode: GameMode }
  | { type: 'SELECT_MODE_CLASSIC' }
  | { type: 'SELECT_MODE_IMPOSTOR' }
  | { type: 'SELECT_MODE_WHOAMI' }
  | { type: 'SELECT_MODE_WHATDOYOUKNOW' }
  | { type: 'PLAYERS_CONFIRMED'; players: string[] }
  | { type: 'THEMES_CONFIRMED'; themes: any[]; saboteurMode?: boolean; gameConfig?: any }
  | { type: 'RESET' };

const STORAGE_KEY = 'ito_app_state_v4';

type PersistedState = {
  screen: Screen;
  gameMode: GameMode;
  players: string[];
  themeIds: string[];
  saboteurMode?: boolean;
  gameConfig?: any;
};

const initialState: State = {
  screen: 'home',
  gameMode: 'classic',
  players: [],
  themes: [],
  saboteurMode: false,
};

// --- REDUCER ---

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GO_HOME':
      return { ...state, screen: 'home' };

    case 'GO_MODE_SELECTION':
      return { ...state, screen: 'mode-selection' };

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_GAME_MODE':
      return { ...state, gameMode: action.gameMode };

    case 'SELECT_MODE_CLASSIC':
      return {
        ...state,
        gameMode: 'classic',
        screen: 'register-classic'
      };

    case 'SELECT_MODE_IMPOSTOR':
      return {
        ...state,
        gameMode: 'impostor',
        screen: 'register-impostor'
      };

    case 'SELECT_MODE_WHOAMI':
      return {
        ...state,
        gameMode: 'whoami',
        screen: 'register-whoami'
      };

    case 'SELECT_MODE_WHATDOYOUKNOW':
      return {
        ...state,
        gameMode: 'whatdoyouknow',
        screen: 'register-whatdoyouknow'
      };

    case 'PLAYERS_CONFIRMED':
      if (state.gameMode === 'impostor') {
        return { ...state, players: action.players, screen: 'theme-impostor' };
      }
      if (state.gameMode === 'whoami') {
        return { ...state, players: action.players, screen: 'theme-whoami' };
      }
      if (state.gameMode === 'whatdoyouknow') {
        return { ...state, players: action.players, screen: 'theme-whatdoyouknow' };
      }
      return { ...state, players: action.players, screen: 'theme-classic' };

    case 'THEMES_CONFIRMED':
      if (state.gameMode === 'impostor') {
        return { ...state, themes: action.themes, screen: 'game-impostor' };
      }
      if (state.gameMode === 'whoami') {
        return { ...state, themes: action.themes, screen: 'game-whoami' };
      }
      if (state.gameMode === 'whatdoyouknow') {
        return { ...state, themes: action.themes, screen: 'game-whatdoyouknow' };
      }
      return { 
        ...state, 
        themes: action.themes, 
        saboteurMode: action.saboteurMode, 
        gameConfig: action.gameConfig,
        screen: 'game-classic' 
      };

    case 'RESET':
      try { localStorage.removeItem(STORAGE_KEY); } catch { }
      return initialState;

    default:
      return state;
  }
}

// --- APP ---

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const modeParam = params.get('mode');

      if (roomParam && roomParam.length === 4) {
        const mode = (modeParam === 'impostor' || modeParam === 'whoami' || modeParam === 'classic' || modeParam === 'whatdoyouknow')
          ? modeParam as GameMode
          : 'classic';

        return {
          screen: 'lobby-setup' as const,
          gameMode: mode,
          players: [],
          themes: [],
          saboteurMode: false,
        };
      }
    } catch (e) {
      console.error('Erro ao ler query params:', e);
    }

    // Hidratação simples
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: PersistedState = JSON.parse(saved);
        // Recria os objetos Theme a partir dos IDs
        const themes = THEMES.filter(t => parsed.themeIds.includes(t.id));
        return {
          screen: parsed.screen,
          gameMode: parsed.gameMode,
          players: parsed.players,
          themes,
          saboteurMode: parsed.saboteurMode || false,
        };
      } catch { }
    }
    return initialState;
  });

  const [isMuted, setIsMuted] = useState(audioService.isMuted());
  const toggleMute = () => {
    const nextVal = audioService.toggleMute();
    setIsMuted(nextVal);
  };

  const onScreenChange = (screen: any) => dispatch({ type: 'SET_SCREEN', screen });
  const onGameModeChange = (gameMode: GameMode) => dispatch({ type: 'SET_GAME_MODE', gameMode });

  const {
    connectionType,
    setConnectionType,
    roomCode,
    isHost,
    connectedPlayers,
    syncGameState,
    playerName,
    setPlayerName,
    playerAvatar,
    handleUpdateAvatar,
    playerId,
    isConnecting,
    handleConnect,
    handleDisconnect,
  } = useMultiplayerSync(onScreenChange, onGameModeChange);

  // Persistência
  useEffect(() => {
    const toSave: PersistedState = {
      screen: state.screen,
      gameMode: state.gameMode,
      players: state.players,
      themeIds: state.themes.map(t => t.id)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state]);

  const renderScreen = () => {
    switch (state.screen) {
      case 'home':
        return (
          <HomeScreen 
            onSelectClassic={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'classic' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectImpostor={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'impostor' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectWhoAmI={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'whoami' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectWhatDoYouKnow={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'whatdoyouknow' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectTranslator={() => { dispatch({ type: 'SET_SCREEN', screen: 'translator-chain' }); }}
          />
        );

      case 'connection-selection':
        return (
          <ConnectionSelectionScreen
            onBack={() => dispatch({ type: 'GO_HOME' })}
            onSelectLocal={() => {
              setConnectionType('local');
              const nextScreen = state.gameMode === 'classic' ? 'register-classic' : 
                                 state.gameMode === 'impostor' ? 'register-impostor' : 
                                 state.gameMode === 'whoami' ? 'register-whoami' : 'register-whatdoyouknow';
              dispatch({ type: 'SET_SCREEN', screen: nextScreen as any });
            }}
            onSelectMultiplayer={() => {
              setConnectionType('multiplayer');
              dispatch({ type: 'SET_SCREEN', screen: 'lobby-setup' });
            }}
            gameMode={state.gameMode}
          />
        );

      case 'mode-selection':
        return (
          <ModeSelectionScreen
            onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' })}
            onSelectClassic={() => dispatch({ type: 'SELECT_MODE_CLASSIC' })}
            onSelectImpostor={() => dispatch({ type: 'SELECT_MODE_IMPOSTOR' })}
            onSelectWhoAmI={() => dispatch({ type: 'SELECT_MODE_WHOAMI' })}
            onSelectWhatDoYouKnow={() => dispatch({ type: 'SELECT_MODE_WHATDOYOUKNOW' })}
            onSelectTranslator={() => dispatch({ type: 'SET_SCREEN', screen: 'translator-chain' })}
          />
        );

      case 'lobby-setup':
        return (
          <LobbySetupScreen
            onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' })}
            playerName={playerName}
            setPlayerName={setPlayerName}
            playerAvatar={playerAvatar}
            setPlayerAvatar={handleUpdateAvatar}
            isConnecting={isConnecting}
            handleConnect={(ip, action, code) => handleConnect(ip, action, code, () => dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-lobby' }))}
            gameMode={state.gameMode}
          />
        );

      case 'multiplayer-lobby':
        return (
          <MultiplayerLobbyScreen
            onBack={() => {
              handleDisconnect();
              dispatch({ type: 'SET_SCREEN', screen: 'lobby-setup' });
            }}
            roomCode={roomCode}
            isHost={isHost}
            connectedPlayers={connectedPlayers}
            playerId={playerId}
            onUpdateAvatar={handleUpdateAvatar}
            onSelectGameMode={(mode) => {
              dispatch({ type: 'SET_GAME_MODE', gameMode: mode });
              if (connectionType === 'multiplayer' && isHost) {
                syncService.syncState({ gameMode: mode });
              }
            }}
            onStartGame={() => {
              const targetScreen =
                state.gameMode === 'impostor' ? 'theme-impostor' :
                  state.gameMode === 'classic' ? 'theme-classic' :
                    state.gameMode === 'whatdoyouknow' ? 'theme-whatdoyouknow' :
                      'theme-whoami';

              if (connectionType === 'multiplayer' && isHost) {
                syncService.syncState({ screen: targetScreen, gameMode: state.gameMode });
              }
              dispatch({ type: 'SET_SCREEN', screen: targetScreen });
            }}
            gameMode={state.gameMode}
          />
        );

      // --- FLUXO CLÁSSICO ---
      case 'register-classic':
        return (
          <PlayerRegistrationScreen
            title="Jogadores (Clássico)"
            accentColor="yellow"
            minPlayers={2}
            onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-selection' })}
            onNext={(players) => dispatch({ type: 'PLAYERS_CONFIRMED', players })}
          />
        );
      case 'theme-classic':
        if (connectionType === 'multiplayer' && !isHost) {
          return <SyncWaitingScreen accentColor="yellow" />;
        }
        return (
          <ThemeSelectionClassic
            onBack={() => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({ screen: 'multiplayer-lobby' });
                dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-lobby' });
              } else {
                dispatch({ type: 'SET_SCREEN', screen: 'register-classic' });
              }
            }}
            onStart={(themes, saboteurMode, config) => {
              if (connectionType === 'multiplayer') {
                let saboteurId = '';
                if (saboteurMode && connectedPlayers.length > 0) {
                  const randomIndex = Math.floor(Math.random() * connectedPlayers.length);
                  saboteurId = connectedPlayers[randomIndex].id;
                }
                syncService.syncState({
                  screen: 'game-classic',
                  themes: themes.map(t => ({ id: t.id, name: t.name, color: t.color, buttonColor: t.buttonColor })),
                  phase: 'init',
                  roundKey: Date.now(),
                  saboteurMode,
                  saboteurId,
                  gameConfig: config
                });
                dispatch({ type: 'THEMES_CONFIRMED', themes, saboteurMode, gameConfig: config });
              } else {
                dispatch({ type: 'THEMES_CONFIRMED', themes, saboteurMode, gameConfig: config });
              }
            }}
          />
        );
      case 'game-classic':
        return (
          <Suspense fallback={<LoadingFallback mode="classic" />}>
            <GameScreenIto
              onBack={() => {
                if (connectionType === 'multiplayer') {
                  handleDisconnect();
                }
                dispatch({ type: 'GO_HOME' });
              }}
              players={connectionType === 'multiplayer' ? connectedPlayers.map(p => p.name) : state.players}
              themes={connectionType === 'multiplayer' ? (syncGameState?.themes || []) : state.themes}
              isMultiplayer={connectionType === 'multiplayer'}
              isHost={isHost}
              syncGameState={syncGameState}
              playerId={playerId}
              connectedPlayers={connectedPlayers}
              isMuted={isMuted}
              toggleMute={toggleMute}
              saboteurMode={state.saboteurMode}
            />
          </Suspense>
        );

      // --- FLUXO IMPOSTOR ---
      case 'register-impostor':
        return (
          <PlayerRegistrationScreen
            title="Jogadores (Impostor)"
            accentColor="purple"
            minPlayers={3}
            onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-selection' })}
            onNext={(players) => dispatch({ type: 'PLAYERS_CONFIRMED', players })}
          />
        );
      case 'theme-impostor':
        if (connectionType === 'multiplayer' && !isHost) {
          return <SyncWaitingScreen accentColor="purple" />;
        }
        return (
          <ThemeSelectionImpostor
            onBack={() => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({ screen: 'multiplayer-lobby' });
                dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-lobby' });
              } else {
                dispatch({ type: 'SET_SCREEN', screen: 'register-impostor' });
              }
            }}
            onStart={(themes) => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({
                  screen: 'game-impostor',
                  themes: themes.map(t => ({ id: t.id, name: t.name })),
                  phase: 'setup',
                  roundKey: Date.now()
                });
                dispatch({ type: 'THEMES_CONFIRMED', themes });
              } else {
                dispatch({ type: 'THEMES_CONFIRMED', themes });
              }
            }}
          />
        );
      case 'game-impostor':
        return (
          <Suspense fallback={<LoadingFallback mode="impostor" />}>
            <GameScreenImpostor
              onBack={() => {
                handleDisconnect();
                dispatch({ type: 'GO_HOME' });
              }}
              players={connectionType === 'multiplayer' ? connectedPlayers.map(p => p.name) : state.players}
              themes={connectionType === 'multiplayer' ? (syncGameState?.themes || []) : state.themes}
              isMultiplayer={connectionType === 'multiplayer'}
              isHost={isHost}
              syncGameState={syncGameState}
              playerId={playerId}
              connectedPlayers={connectedPlayers}
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          </Suspense>
        );

      // --- FLUXO QUEM SOU EU ---
      case 'register-whoami':
        return (
          <PlayerRegistrationScreen
            title="Jogadores (Quem Sou Eu)"
            accentColor="emerald"
            minPlayers={2}
            onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-selection' })}
            onNext={(players) => dispatch({ type: 'PLAYERS_CONFIRMED', players })}
          />
        );
      case 'theme-whoami':
        if (connectionType === 'multiplayer' && !isHost) {
          return <SyncWaitingScreen accentColor="emerald" />;
        }
        return (
          <ThemeSelectionWhoAmI
            onBack={() => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({ screen: 'multiplayer-lobby' });
                dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-lobby' });
              } else {
                dispatch({ type: 'SET_SCREEN', screen: 'register-whoami' });
              }
            }}
            onStart={(themes) => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({
                  screen: 'game-whoami',
                  themes: themes.map(t => ({ id: t.id, name: t.name, personalities: t.personalities || [] })),
                  phase: 'setup',
                  roundKey: Date.now()
                });
                dispatch({ type: 'THEMES_CONFIRMED', themes });
              } else {
                dispatch({ type: 'THEMES_CONFIRMED', themes });
              }
            }}
          />
        );
      case 'game-whoami':
        return (
          <Suspense fallback={<LoadingFallback mode="whoami" />}>
            <GameScreenWhoAmI
              onBack={() => {
                handleDisconnect();
                dispatch({ type: 'GO_HOME' });
              }}
              players={connectionType === 'multiplayer' ? connectedPlayers.map(p => p.name) : state.players}
              themes={connectionType === 'multiplayer' ? (syncGameState?.themes || []) : state.themes}
              isMultiplayer={connectionType === 'multiplayer'}
              isHost={isHost}
              syncGameState={syncGameState}
              playerId={playerId}
              connectedPlayers={connectedPlayers}
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          </Suspense>
        );

      // --- FLUXO O QUE VOCÊ SABE ---
      case 'register-whatdoyouknow':
        return (
          <PlayerRegistrationScreen
            title="Jogadores (O Que Você Sabe?)"
            accentColor="rose"
            minPlayers={3}
            onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-selection' })}
            onNext={(players) => dispatch({ type: 'PLAYERS_CONFIRMED', players })}
          />
        );
      case 'theme-whatdoyouknow':
        if (connectionType === 'multiplayer' && !isHost) {
          return <SyncWaitingScreen accentColor="rose" />;
        }
        return (
          <ThemeSelectionWhatDoYouKnow
            onBack={() => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({ screen: 'multiplayer-lobby' });
                dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-lobby' });
              } else {
                dispatch({ type: 'SET_SCREEN', screen: 'register-whatdoyouknow' });
              }
            }}
            onStart={(themes) => {
              if (connectionType === 'multiplayer') {
                syncService.syncState({
                  screen: 'game-whatdoyouknow',
                  themes: themes.map(t => ({ id: t.id, name: t.name, questions: t.questions || [] })),
                  phase: 'setup',
                  roundKey: Date.now()
                });
                dispatch({ type: 'THEMES_CONFIRMED', themes });
              } else {
                dispatch({ type: 'THEMES_CONFIRMED', themes });
              }
            }}
          />
        );
      case 'game-whatdoyouknow':
        return (
          <Suspense fallback={<LoadingFallback mode="whatdoyouknow" />}>
            <GameScreenWhatDoYouKnow
              onBack={() => {
                handleDisconnect();
                dispatch({ type: 'GO_HOME' });
              }}
              players={connectionType === 'multiplayer' ? connectedPlayers.map(p => p.name) : state.players}
              themes={connectionType === 'multiplayer' ? (syncGameState?.themes || []) : state.themes}
              isMultiplayer={connectionType === 'multiplayer'}
              isHost={isHost}
              syncGameState={syncGameState}
              playerId={playerId}
              connectedPlayers={connectedPlayers}
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          </Suspense>
        );

      case 'translator-chain':
        return (
          <TranslatorScreen
            onBack={() => dispatch({ type: 'GO_MODE_SELECTION' })}
          />
        );

      default:
        return (
          <HomeScreen 
            onSelectClassic={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'classic' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectImpostor={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'impostor' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectWhoAmI={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'whoami' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectWhatDoYouKnow={() => { dispatch({ type: 'SET_GAME_MODE', gameMode: 'whatdoyouknow' }); dispatch({ type: 'SET_SCREEN', screen: 'connection-selection' }); }}
            onSelectTranslator={() => { dispatch({ type: 'SET_SCREEN', screen: 'translator-chain' }); }}
          />
        );
    }
  };

  return (
    <div className="w-full h-full min-h-[100dvh] bg-party-bg text-party-dark font-sans overflow-hidden flex flex-col selection:bg-party-blue relative">
      <Toaster position="top-center" theme="dark" richColors />
      {!state.screen.startsWith('game-') && state.screen !== 'home' && (
        <button
          onClick={toggleMute}
          aria-label={isMuted ? "Ativar som" : "Desativar som"}
          className="absolute top-4 right-4 z-50 p-2.5 bg-white/90 border border-slate-200/80 hover:bg-white text-slate-600 hover:text-party-blue rounded-full shadow-sm transition-all backdrop-blur-md"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
      {/* Container principal livre de barras de rolagem globais */}
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
        {renderScreen()}
      </div>
    </div>
  );
}

// --- AUXILIARY COMPONENTS ---

const LoadingFallback = ({ mode }: { mode: GameMode }) => {
  const getColors = () => {
    if (mode === 'impostor') return 'text-purple-600 bg-purple-50';
    if (mode === 'classic') return 'text-yellow-500 bg-yellow-50';
    if (mode === 'whatdoyouknow') return 'text-rose-500 bg-rose-50';
    if (mode === 'translator') return 'text-blue-500 bg-blue-50';
    return 'text-emerald-500 bg-emerald-50';
  };
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F5F7FB] h-full w-full">
      <div className={`p-6 rounded-full shadow-card animate-spin border border-slate-100 ${getColors()}`}>
        <RefreshCw size={48} />
      </div>
    </div>
  );
};