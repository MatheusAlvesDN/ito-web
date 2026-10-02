import { useState, useEffect, useCallback } from 'react';
import { syncService, type ConnectedPlayer } from '../utils/syncService';
import { getPlayerAvatar, savePlayerAvatar } from '../utils/avatarService';
import { toast } from 'sonner';

export function useMultiplayerSync(
  onScreenChange?: (screen: any) => void,
  onGameModeChange?: (mode: any) => void
) {
  const [connectionType, setConnectionType] = useState<'local' | 'multiplayer'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'multiplayer';
    } catch {}
    return 'local';
  });
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [syncGameState, setSyncGameState] = useState<any>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Carregar configurações iniciais salvas
  useEffect(() => {
    const savedName = localStorage.getItem('ito_player_name');
    if (savedName) {
      setPlayerName(savedName);
      const savedAvatar = localStorage.getItem('ito_player_avatar') || getPlayerAvatar(savedName);
      setPlayerAvatar(savedAvatar);
    }
  }, []);

  // Limpa conexão ao desmontar
  useEffect(() => {
    return () => {
      syncService.disconnect();
    };
  }, []);

  const handleUpdateAvatar = (newAvatar: string) => {
    setPlayerAvatar(newAvatar);
    if (playerName) {
      savePlayerAvatar(playerName, newAvatar);
    }
    localStorage.setItem('ito_player_avatar', newAvatar);
    syncService.updatePlayerAvatar(newAvatar);
  };

  const handleConnect = async (
    customIp: string, 
    actionType: 'create' | 'join', 
    joinCode?: string, 
    onSuccess?: () => void,
    avatarOverride?: string
  ) => {
    setIsConnecting(true);
    const effectiveAvatar = avatarOverride || playerAvatar || getPlayerAvatar(playerName);
    try {
      syncService.setServerUrl(customIp);
      await syncService.connect({
        onRoomCreated: (code, pId, playersList) => {
          setRoomCode(code);
          setPlayerId(pId);
          setIsHost(true);
          setConnectedPlayers([...playersList]);
          setIsConnecting(false);
          toast.success('Sala criada com sucesso!');
          if (onSuccess) onSuccess();
        },
        onRoomJoined: (code, pId, playersList, initialGameState) => {
          setRoomCode(code);
          setPlayerId(pId);
          setIsHost(false);
          setConnectedPlayers([...playersList]);
          setSyncGameState(initialGameState);
          if (initialGameState?.gameMode && onGameModeChange) {
            onGameModeChange(initialGameState.gameMode);
          }
          if (initialGameState?.screen && onScreenChange) {
            onScreenChange(initialGameState.screen);
          }
          setIsConnecting(false);
          toast.success('Entrou na sala!');
          if (onSuccess) onSuccess();
        },
        onPlayerJoined: (playersList) => {
          setConnectedPlayers([...playersList]);
          const newPlayer = playersList[playersList.length - 1];
          if (newPlayer && newPlayer.id !== syncService.currentPlayerId) {
            toast.info(`${newPlayer.name} entrou na sala`);
          }
        },
        onPlayerLeft: (playersList) => {
          setConnectedPlayers([...playersList]);
          toast.info('Um jogador saiu da sala');
        },
        onStateUpdated: (newGameState) => {
          setSyncGameState(newGameState);
          if (newGameState.gameMode && onGameModeChange) {
            onGameModeChange(newGameState.gameMode);
          }
          if (newGameState.screen && onScreenChange) {
            onScreenChange(newGameState.screen);
          }
        },
        onBecomeHost: () => {
          setIsHost(true);
          toast.success('Você agora é o líder da sala!');
        },
        onReactionReceived: (pId, pName, reaction) => {
          window.dispatchEvent(new CustomEvent('ito-reaction', { 
            detail: { playerId: pId, playerName: pName, reaction } 
          }));
        },
        onError: (msg) => {
          setIsConnecting(false);
          toast.error(msg);
        }
      });

      // Salva no localStorage para conveniência
      localStorage.setItem('ito_multiplayer_ip', customIp);
      localStorage.setItem('ito_player_name', playerName);
      if (effectiveAvatar) {
        localStorage.setItem('ito_player_avatar', effectiveAvatar);
      }

      if (actionType === 'create') {
        syncService.createRoom(playerName, effectiveAvatar);
      } else if (actionType === 'join' && joinCode) {
        syncService.joinRoom(joinCode, playerName, effectiveAvatar);
      }
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível conectar ao servidor.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = useCallback(() => {
    syncService.disconnect();
    setRoomCode('');
    setConnectedPlayers([]);
    setSyncGameState(null);
    setIsHost(false);
    setConnectionType('local');
    toast.info('Desconectado da sala');
  }, []);

  return {
    connectionType,
    setConnectionType,
    roomCode,
    isHost,
    connectedPlayers,
    syncGameState,
    playerName,
    setPlayerName,
    playerAvatar,
    setPlayerAvatar,
    handleUpdateAvatar,
    playerId,
    isConnecting,
    handleConnect,
    handleDisconnect,
  };
}
