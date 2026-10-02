import { Peer, type DataConnection } from 'peerjs';

// Utilitário para vibração física (Haptic Feedback) no mobile/navegador
export const triggerVibration = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      console.warn('Vibration API not supported or failed:', err);
    }
  }
};

// Serviço de Sincronização em Tempo Real via WebRTC Peer-to-Peer (PeerJS)
export type ConnectedPlayer = {
  id: string;
  name: string;
  avatar?: string;
};

type SyncCallbackMap = {
  onRoomCreated?: (roomCode: string, playerId: string, players: ConnectedPlayer[]) => void;
  onRoomJoined?: (roomCode: string, playerId: string, players: ConnectedPlayer[], gameState: any) => void;
  onPlayerJoined?: (players: ConnectedPlayer[]) => void;
  onPlayerLeft?: (players: ConnectedPlayer[]) => void;
  onStateUpdated?: (gameState: any) => void;
  onBecomeHost?: () => void;
  onError?: (message: string) => void;
  onReactionReceived?: (playerId: string, playerName: string, reactionType: string) => void;
};

class SyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // clientId -> DataConnection
  private callbacks: SyncCallbackMap = {};
  public currentRoomCode: string | null = null;
  public currentPlayerId: string | null = null;
  public isHost: boolean = false;
  public playerName: string | null = null;
  public playerAvatar: string | null = null;
  private hostConn: DataConnection | null = null; // Para clientes, conexão direta com o host
  private connectedPlayers: ConnectedPlayer[] = [];
  private gameState: any = null;

  // Controle de Reconexão Automática
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  public isReconnecting = false;

  // Método legado mantido para compatibilidade estrutural
  public setServerUrl(_ipOrUrl: string) {
    console.log('PeerJS utiliza nuvem de sinalização gratuita e automática. IP ignorado.');
  }

  // Método legado mantido para compatibilidade estrutural
  public getServerUrl(): string {
    return 'PeerJS Cloud (P2P)';
  }

  // Conecta e registra os callbacks
  public connect(callbacks: SyncCallbackMap): Promise<void> {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return Promise.resolve(); // Resolução imediata, o peer é instanciado na criação/entrada da sala
  }

  // Desconecta e limpa todos os canais P2P
  public disconnect() {
    console.log('Desconectando e encerrando sessões P2P...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    this.connections.clear();
    this.hostConn = null;
    this.currentRoomCode = null;
    this.currentPlayerId = null;
    this.isHost = false;
    this.connectedPlayers = [];
    this.gameState = null;
  }

  // Envia dados para um DataConnection específico
  private sendJson(conn: DataConnection, data: any) {
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  // Cria a sala WebRTC P2P atuando como Host (Autoritativo)
  public createRoom(hostName: string, avatar?: string) {
    this.isHost = true;
    this.playerName = hostName;
    this.playerAvatar = avatar || null;
    this.connectedPlayers = [];
    this.connections.clear();

    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const roomCode = generateCode();
    this.currentRoomCode = roomCode;

    // Conecta à nuvem do PeerJS registrando um ID amigável com prefixo exclusivo
    const hostId = `itogame-${roomCode}`;
    this.peer = new Peer(hostId);

    this.peer.on('open', (id) => {
      console.log(`Sala P2P aberta com sucesso! ID do Host: ${id}`);
      this.currentPlayerId = id;
      
      // O Host é o primeiro integrante da lista de jogadores
      this.connectedPlayers = [{ id, name: hostName, avatar: avatar || undefined }];

      if (this.callbacks.onRoomCreated) {
        this.callbacks.onRoomCreated(roomCode, id, [...this.connectedPlayers]);
      }
    });

    this.peer.on('connection', (conn) => {
      console.log(`Novo dispositivo tentando conectar na rede local: ${conn.peer}`);

      conn.on('open', () => {
        // Conexão de dados WebRTC aberta, aguarda mensagem de identificação 'JOIN' do cliente
      });

      conn.on('data', (data: any) => {
        try {
          const msg = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (msg.type === 'JOIN') {
            const newPlayer: ConnectedPlayer = { id: conn.peer, name: msg.playerName, avatar: msg.avatar };
            this.connections.set(conn.peer, conn);
            
            // Adiciona o jogador se já não estiver na lista ou atualiza o nome e avatar
            const existingIndex = this.connectedPlayers.findIndex(p => p.id === conn.peer);
            if (existingIndex >= 0) {
              const updated = [...this.connectedPlayers];
              updated[existingIndex] = newPlayer;
              this.connectedPlayers = updated;
            } else {
              this.connectedPlayers = [...this.connectedPlayers, newPlayer];
            }

            console.log(`Jogador P2P ${msg.playerName} entrou na sala. Total: ${this.connectedPlayers.length}`);

            // Notifica o Host localmente com nova referência
            if (this.callbacks.onPlayerJoined) {
              this.callbacks.onPlayerJoined([...this.connectedPlayers]);
            }

            // Confirma a entrada do jogador enviando a lista atualizada e o estado atual do jogo
            this.sendJson(conn, {
              type: 'ROOM_JOINED',
              roomCode,
              players: [...this.connectedPlayers],
              gameState: this.gameState || { phase: 'lobby' }
            });

            // Envia a nova lista de jogadores para todos os outros participantes da sala
            this.broadcast({
              type: 'PLAYER_JOINED',
              players: [...this.connectedPlayers]
            }, conn.peer);
          }

          if (msg.type === 'UPDATE_AVATAR') {
            const pIndex = this.connectedPlayers.findIndex(p => p.id === conn.peer);
            if (pIndex >= 0) {
              const updated = [...this.connectedPlayers];
              updated[pIndex] = { ...updated[pIndex], avatar: msg.avatar };
              this.connectedPlayers = updated;

              if (this.callbacks.onPlayerJoined) {
                this.callbacks.onPlayerJoined([...this.connectedPlayers]);
              }

              this.broadcast({
                type: 'PLAYERS_UPDATED',
                players: [...this.connectedPlayers]
              });
            }
          }

          if (msg.type === 'CLIENT_STATE_UPDATE') {
            // Um cliente requisitou alteração de estado (ex: clicou em 'acertou' ou revelou card)
            this.gameState = { ...this.gameState, ...msg.gameState };
            
            if (this.callbacks.onStateUpdated) {
              this.callbacks.onStateUpdated(this.gameState);
            }

            // Distribui a alteração para todos
            this.broadcast({
              type: 'STATE_UPDATED',
              gameState: this.gameState
            });
          }

          if (msg.type === 'REACTION') {
            // Repassa a reação para todos
            this.broadcast({
              type: 'REACTION',
              playerId: conn.peer,
              playerName: msg.playerName,
              reactionType: msg.reactionType
            });
            // Aciona o callback do Host localmente
            if (this.callbacks.onReactionReceived) {
              this.callbacks.onReactionReceived(conn.peer, msg.playerName, msg.reactionType);
            }
          }
        } catch (err) {
          console.error('Erro ao ler dados recebidos via P2P:', err);
        }
      });

      conn.on('close', () => {
        console.log(`Jogador desconectou do canal P2P: ${conn.peer}`);
        this.handlePlayerDisconnect(conn.peer);
      });

      conn.on('error', (err) => {
        console.error(`Erro no canal P2P com ${conn.peer}:`, err);
        this.handlePlayerDisconnect(conn.peer);
      });
    });

    this.peer.on('error', (err: any) => {
      console.error('Erro no PeerJS Host:', err);
      if (err.type === 'unavailable-id') {
        // Se houver uma colisão rara de ID na nuvem, gera um novo código
        this.createRoom(hostName);
      } else if (this.callbacks.onError) {
        this.callbacks.onError('Falha ao conectar com o serviço de sinalização P2P. Verifique sua Internet.');
      }
    });
  }

  // Gerencia a saída de um jogador
  private handlePlayerDisconnect(peerId: string) {
    this.connections.delete(peerId);
    this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== peerId);

    if (this.callbacks.onPlayerLeft) {
      this.callbacks.onPlayerLeft([...this.connectedPlayers]);
    }

    this.broadcast({
      type: 'PLAYER_LEFT',
      players: [...this.connectedPlayers]
    });
  }

  // Permite a entrada de um cliente buscando o Host
  public joinRoom(roomCode: string, playerName: string, avatar?: string) {
    this.isHost = false;
    this.playerName = playerName;
    this.playerAvatar = avatar || null;
    this.currentRoomCode = roomCode.toUpperCase().trim();
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    // Cria um peer com ID aleatório gerado pela nuvem
    this.peer = new Peer();

    this.peer.on('open', (id) => {
      this.currentPlayerId = id;
      console.log(`Cliente P2P pronto! Conectando com itogame-${this.currentRoomCode}...`);
      
      const hostId = `itogame-${this.currentRoomCode}`;
      this.hostConn = this.peer!.connect(hostId);

      this.hostConn.on('open', () => {
        console.log('Conexão P2P de sinalização aberta com o Host! Enviando registro...');
        this.sendJson(this.hostConn!, {
          type: 'JOIN',
          playerName,
          avatar
        });
      });

      this.registerClientConnectionEvents();
    });

    this.peer.on('error', (err: any) => {
      console.error('Erro no PeerJS Cliente:', err);
      if (this.isReconnecting) return;
      if (this.callbacks.onError) {
        if (err.type === 'peer-unavailable') {
          this.callbacks.onError('Sala não encontrada! Confirme o código de 4 letras digitado.');
        } else {
          this.callbacks.onError('Falha ao sinalizar com o serviço P2P. Verifique sua rede.');
        }
      }
    });
  }

  // Registra eventos e mensagens recebidos do Host no canal P2P
  private registerClientConnectionEvents() {
    if (!this.hostConn) return;

    this.hostConn.on('data', (data: any) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (msg.type === 'ROOM_JOINED') {
          this.connectedPlayers = Array.isArray(msg.players) ? [...msg.players] : [];
          this.gameState = msg.gameState;

          if (this.callbacks.onRoomJoined) {
            this.callbacks.onRoomJoined(this.currentRoomCode!, this.currentPlayerId || '', [...this.connectedPlayers], msg.gameState);
          }
        }

        if (msg.type === 'PLAYER_JOINED' || msg.type === 'PLAYERS_UPDATED') {
          this.connectedPlayers = Array.isArray(msg.players) ? [...msg.players] : [];
          if (this.callbacks.onPlayerJoined) {
            this.callbacks.onPlayerJoined([...this.connectedPlayers]);
          }
        }

        if (msg.type === 'PLAYER_LEFT') {
          this.connectedPlayers = Array.isArray(msg.players) ? [...msg.players] : [];
          if (this.callbacks.onPlayerLeft) {
            this.callbacks.onPlayerLeft([...this.connectedPlayers]);
          }
        }

        if (msg.type === 'STATE_UPDATED') {
          this.gameState = msg.gameState;
          if (this.callbacks.onStateUpdated) {
            this.callbacks.onStateUpdated(msg.gameState);
          }
        }

        if (msg.type === 'REACTION') {
          if (this.callbacks.onReactionReceived) {
            this.callbacks.onReactionReceived(msg.playerId, msg.playerName, msg.reactionType);
          }
        }
      } catch (err) {
        console.error('Erro ao ler mensagens do Host via P2P:', err);
      }
    });

    this.hostConn.on('close', () => {
      console.log('A conexão P2P foi fechada pelo Host.');
      if (this.currentRoomCode && !this.isHost && !this.isReconnecting) {
        this.attemptReconnect();
      } else if (this.callbacks.onError) {
        this.callbacks.onError('A sala foi encerrada pelo Host.');
      }
    });

    this.hostConn.on('error', (err) => {
      console.error('Erro no canal P2P do Host:', err);
      if (this.currentRoomCode && !this.isHost && !this.isReconnecting) {
        this.attemptReconnect();
      } else if (this.callbacks.onError) {
        this.callbacks.onError('Perda de sinal ou erro ao se comunicar com a sala.');
      }
    });
  }

  // Tenta restabelecer conexão com o Host de forma resiliente
  private attemptReconnect() {
    if (this.isReconnecting || !this.currentRoomCode) return;
    this.isReconnecting = true;
    this.reconnectAttempts = 0;
    
    const tryConnect = () => {
      if (!this.currentRoomCode || this.isHost) {
        this.isReconnecting = false;
        return;
      }
      this.reconnectAttempts++;
      console.log(`Tentativa de reconexão ${this.reconnectAttempts} de ${this.maxReconnectAttempts}...`);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(`Conexão perdida! Tentando reconectar (Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      }

      // Limpa conexão antiga
      if (this.hostConn) {
        try { this.hostConn.close(); } catch {}
        this.hostConn = null;
      }

      // Se o peer local estiver desconectado ou destruído, recria
      if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
        if (this.peer && !this.peer.destroyed) {
          try { this.peer.destroy(); } catch {}
        }
        this.peer = new Peer();
        this.peer.on('open', () => {
          this.establishHostConnection(tryConnect);
        });
        this.peer.on('error', (err) => {
          console.error('Erro no peer durante reconexão:', err);
          this.scheduleNextAttempt(tryConnect);
        });
      } else {
        this.establishHostConnection(tryConnect);
      }
    };

    tryConnect();
  }

  // Estabelece a conexão física de dados com o Host
  private establishHostConnection(tryConnectCallback: () => void) {
    const hostId = `itogame-${this.currentRoomCode}`;
    console.log(`Conectando ao host em reconexão: ${hostId}`);
    this.hostConn = this.peer!.connect(hostId);

    // Timeout de 4s
    const connTimeout = setTimeout(() => {
      if (this.hostConn && !this.hostConn.open) {
        console.warn('Timeout de conexão excedido na reconexão.');
        this.scheduleNextAttempt(tryConnectCallback);
      }
    }, 4000);

    this.hostConn.on('open', () => {
      clearTimeout(connTimeout);
      console.log('Reconectado com sucesso ao Host!');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      
      this.registerClientConnectionEvents();
      
      // Envia o JOIN para sinalizar ao Host que estamos de volta e receber o estado atualizado
      this.sendJson(this.hostConn!, {
        type: 'JOIN',
        playerName: this.playerName,
        avatar: this.playerAvatar
      });
    });

    this.hostConn.on('error', (err) => {
      clearTimeout(connTimeout);
      console.error('Erro na conexão com host durante reconexão:', err);
      this.scheduleNextAttempt(tryConnectCallback);
    });
  }

  // Agenda próxima tentativa de reconexão
  private scheduleNextAttempt(tryConnectCallback: () => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectTimeout = setTimeout(tryConnectCallback, 3000);
    } else {
      console.error('Número máximo de tentativas de reconexão atingido.');
      this.isReconnecting = false;
      this.disconnect();
      if (this.callbacks.onError) {
        this.callbacks.onError('Falha na reconexão. A sala não está acessível no momento.');
      }
    }
  }

  // Sincroniza o estado do jogo entre todos os peers
  public syncState(gameState: any) {
    this.gameState = { ...this.gameState, ...gameState };
    
    if (this.isHost) {
      // Host transmite diretamente para todos os conectados
      this.broadcast({
        type: 'STATE_UPDATED',
        gameState: this.gameState
      });
    } else {
      // Cliente envia requisição de alteração de estado para o Host atualizar e redistribuir
      if (this.hostConn && this.hostConn.open) {
        this.sendJson(this.hostConn, {
          type: 'CLIENT_STATE_UPDATE',
          gameState: this.gameState
        });
      }
    }
  }

  // Envia uma reação (emoji) para todos os jogadores via P2P
  public sendReaction(reactionType: string) {
    if (this.isHost) {
      // Se for o Host, faz broadcast direto para todos os clientes
      this.broadcast({
        type: 'REACTION',
        playerId: this.currentPlayerId || '',
        playerName: this.playerName || '',
        reactionType
      });
      // Executa localmente
      if (this.callbacks.onReactionReceived) {
        this.callbacks.onReactionReceived(this.currentPlayerId || '', this.playerName || '', reactionType);
      }
    } else {
      // Se for cliente, envia para o Host para ele repassar
      if (this.hostConn && this.hostConn.open) {
        this.sendJson(this.hostConn, {
          type: 'REACTION',
          playerName: this.playerName || '',
          reactionType
        });
      }
    }
  }

  // Atualiza o avatar do jogador local e transmite para todos
  public updatePlayerAvatar(newAvatar: string) {
    this.playerAvatar = newAvatar;
    if (this.isHost) {
      const hostIndex = this.connectedPlayers.findIndex(p => p.id === this.currentPlayerId);
      if (hostIndex >= 0) {
        const updated = [...this.connectedPlayers];
        updated[hostIndex] = { ...updated[hostIndex], avatar: newAvatar };
        this.connectedPlayers = updated;

        if (this.callbacks.onPlayerJoined) {
          this.callbacks.onPlayerJoined([...this.connectedPlayers]);
        }

        this.broadcast({
          type: 'PLAYERS_UPDATED',
          players: [...this.connectedPlayers]
        });
      }
    } else if (this.hostConn && this.hostConn.open) {
      this.sendJson(this.hostConn, {
        type: 'UPDATE_AVATAR',
        avatar: newAvatar
      });
    }
  }

  // Faz o broadcast das mensagens P2P
  private broadcast(data: any, excludeClientId: string | null = null) {
    this.connections.forEach((conn, clientId) => {
      if (clientId !== excludeClientId && conn.open) {
        this.sendJson(conn, data);
      }
    });
  }
}

export const syncService = new SyncService();
