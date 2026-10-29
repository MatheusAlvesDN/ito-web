# Views de jogo (`src/features/games/`)

Cada modo tem uma view **puramente de apresentação**: recebe o `game` que o servidor mandou no
`STATE` e dispara ações (`send({...})`). **Nenhuma regra de jogo no cliente** — nada de calcular
pontos, sortear, validar vez ou decidir fase. Se a tela precisa de um dado que não está na view,
o lugar certo é o motor (backend), não o cliente.

Fontes do contrato: `backend/app/websockets/PROTOCOL.md` (sala), `backend/app/games/PROTOCOL.md`
(views/ações de cada modo) e os docstrings de `backend/app/games/*.py`.

## Estrutura

```
src/lib/room/            cliente do WebSocket (não é específico de modo)
  gameTypes.ts           views, ações e configs TIPADAS de todos os modos (ItoView, ImpostorAction…)
  types.ts               RoomState, RoomInfo, RoomEventDataMap, mensagens
  roomClient.ts          roomClient (singleton por aba)
  useRoom.ts             useRoom, useRoomEvent, useRoomError, useCountdown, formatSeconds, timerRemaining
src/features/games/
  index.ts               GAME_VIEWS (registro) + reexports
  types.ts               GameViewProps<M>, SeatInfo
  modes.ts               MODE_META: mín. de jogadores, campos de config, tema livre, "como jogar"
  seats.ts               buildSeatsById, seatOf
  components/            componentes compartilhados (abaixo)
  whatdoyouknow/         implementação de referência (completa)
  ito/ impostor/ whoami/ stubs "Em desenvolvimento" — substitua o corpo do componente
```

A sala (lobby, cabeçalho, reações, reconexão, wake lock, sons/toasts de eventos) fica em
`src/features/play/` — **não** é responsabilidade da view.

## Contrato: `GameViewProps<M>`

```ts
export default function ImpostorView(props: GameViewProps<'impostor'>) { … }
```

| Prop | O quê |
|---|---|
| `state` | `RoomState` completo (`room`, `you`, `game`, `serverNow`, `rev`) |
| `game` | `state.game` já tipado para o modo (`ImpostorView`, `ItoView`, `WhoAmIView`…) |
| `you` | `{playerId, isHost, controls}` |
| `mySeatId` | online: seu assento (= `playerId`); local: `null` (o aparelho controla todos) |
| `send(action, asSeat?)` | `GAME_ACTION`. `action` é tipada (`GameActionByMode[M]`). `asSeat` **só** no Pass and Play |
| `isHost` | este socket é o líder (local: sempre `true`) |
| `local` | sala Pass and Play (um aparelho) |
| `seatsById` | `Record<id, {id, name, avatar?, connected, mine}>` — `game.seats` + dados da sala |
| `now()` | relógio do servidor agora (segundos) — compare com `timer.deadline` |

Registro em `index.ts`:

```ts
impostor: {
  View: lazy(() => import('./impostor/ImpostorView')),   // export default
  headerInfo: (g) => `Rodada ${g.round}`,                 // subtítulo do cabeçalho (opcional)
},
```

O cabeçalho (nome do modo, `headerInfo`, som, tema claro/escuro, menu com "Voltar ao lobby"
para o líder e "Sair da sala") e a bandeja de reações (online) são do `GameScreen`. Um erro na
view cai num error boundary sem derrubar a sala.

## Helpers

**Tempo** (`lib/room`)
- `useCountdown(timer)` → segundos restantes inteiros (atualiza sozinho enquanto corre; `null` sem timer).
- `timerRemaining(timer, serverNow)` (fracionário), `formatSeconds(s)` → `m:ss`.

**Assentos** (`seats.ts`)
- `seatOf(seatsById, id, fallbackName?)` — nunca quebra com id de quem saiu.
- `SeatLabel {seat, size?, highlight?, showYou?, trailing?}` — avatar + nome (+ "(você)", "· desconectado").

**Layout** (`components/`)
- `ActionBar {children, hint?}` — faixa de botões grudada no pé da área rolável. Use como **último filho** da view.
- `WaitingForHost {children?}` — "Aguardando o líder…" para quem não é líder.
- `InDevelopment {name, phase}` — o placeholder dos stubs.

**Cronômetro**: `TimerPanel {timer, canControl, send, label?, tickLast?}` — mostra m:ss + barra; com
`canControl` (= `isHost`) mostra Pausar/Retomar, +30s, Reiniciar (`TIMER_*`). Tique sonoro nos
últimos 5 s. Retomar fica desabilitado em 0 (o servidor recusa `TIMER_RESUME` com `time_over`).

**Cartas secretas**
- Local — `SecretCardDistribution<C extends {seatId}>`:
  ```tsx
  {game.distribution && (
    <SecretCardDistribution
      distribution={game.distribution}
      card={game.card}
      seatsById={seatsById}
      send={send}
      renderCard={(c) => <p className="font-display text-2xl font-bold">{c.question}</p>}
      cardActions={(c) => …}          // opcional (Quem Sou Eu: REROLL {seatId: c.seatId})
      lastLabel="Começar a discussão" // botão na última carta
      hint="…"                        // opcional
    />
  )}
  ```
  Ele mesmo manda `REVEAL_CARD` / `HIDE_CARD` / `NEXT_CARD` com `asSeat = distribution.current`,
  mostra "Passe o celular para X", progresso e "Ver de novo". O segredo só existe em `game.card`
  enquanto revelado — não guarde em estado local.
- Online — `OnlineSecretCard {children, acknowledged, onAck?, viewedCount?, total?, title?}`:
  carta coberta, toque para ver; "Já vi minha carta" → passe `onAck={() => send({type: 'ACK_CARD'})}`.
  `acknowledged = game.viewed.includes(mySeatId)`, `viewedCount = game.viewed.length`,
  `total = game.roundSeatIds.length`.

**Eventos**: sons/toasts genéricos já estão em `play/useRoomFeedback.ts` (`time_up`,
`round_result`, `saboteur_result`, `round_scored`, `guessed`, `round_aborted`, `target_changed`,
entradas/saídas, `host_changed`…). Se a view precisar de um efeito próprio (animação):
`useRoomEvent('round_result', (d) => …)` — `d` já é tipado por `RoomEventDataMap`.

## Convenções

- Ramifique por `game.phase` em subcomponentes (`QuestionStep`, `ScoringStep`…). Use
  `key={game.phaseSeq}` para reiniciar animação/estado local ao mudar de fase.
- Botões de ação do líder só com `isHost`; outros veem o mesmo conteúdo + `WaitingForHost`.
  Online, ações de assento (`ACK_CARD`, `VOTE`, `TOGGLE_GUESSED` de outro) vão **sem** `asSeat`.
- Local: o aparelho é o líder e controla todos (`isHost === true`); segredos só via
  `SecretCardDistribution`. Online: segredo só em `game.you`.
- Não mostre nada que a view não trouxe; nunca tente "deduzir" segredos.
- Estado local só para UI (carta coberta/descoberta, aba aberta). Nada de espelhar o jogo.
- Estilo: só componentes de `src/ui` e tokens (`bg-surface`, `text-muted`, `border-line`,
  `bg-brand/10`, `text-brand-strong` para laranja em texto, `text-brand-ink` sobre laranja),
  opacidades padrão (5, 10, 15, 20…). Sem `dark:`, sem `slate-*`/`blue-*`. Mobile first (400px).
- Textos em português; ícones de `lucide-react`; sons via `utils/audioService`.
- Não edite `src/ui/**`, `src/features/play/**` nem `src/lib/room/**` sem combinar — se faltar algo
  genérico, crie em `games/components/` e exporte em `components/index.ts`.
- Antes de entregar: `./node_modules/.bin/tsc -b`, `./node_modules/.bin/eslint src/features/games`
  (0 problemas; o lint do react-hooks v7 é estrito: sem `setState` síncrono em effect, sem
  `Date.now()`/`Math.random()` no render).

## Referência: `whatdoyouknow/WhatDoYouKnowView.tsx`

- `WhatDoYouKnowView` só despacha pela fase: `scoring` → `ScoringStep`, `leaderboard` →
  `LeaderboardStep`, senão `QuestionStep`.
- `QuestionStep`: card do alvo (`seatOf(seatsById, game.targetId)`; online e alvo = você →
  "Você!"), pergunta (`key={game.phaseSeq}` anima a troca), instrução, placar compacto e
  `ActionBar` com `GO_SCORING` / `NEXT_ROUND` (pular) para o líder.
- `ScoringStep`: lista os assentos ≠ alvo; líder clica → `TOGGLE_WINNER {seatId}` (marcado vem de
  `game.winners`, não de estado local); `CONFIRM`. Não-líder vê a mesma lista só leitura.
- `LeaderboardStep`: `game.ranking` + `game.lastGains` (+N) e `NEXT_ROUND`.
- Nenhum cálculo de pontos no cliente — o texto "X ganha +N" só reflete `winners.length`.

## Testar ponta a ponta

1. Backend + Vite numa porta livre (as 8000/5173 podem ser de outra pessoa — **não mate**):
   `BACKEND_PORT=8010 ./run.sh backend` e um `vite --config <tmp>.config.ts` com `server.port`
   próprio e proxy `/api` → `http://localhost:8010`, `/ws` → `ws://localhost:8010` (`ws: true`).
   O config precisa estar dentro do projeto (para achar `vite`); apague-o no fim.
2. Jogadores extras com o `WebSocket` global do Node pelo proxy do Vite:
   ```js
   const ws = new WebSocket('ws://localhost:5180/ws');
   ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'STATE') state = m; };
   ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode, playerId: 'bot_1', playerName: 'Edu', avatar: null }));
   ws.send(JSON.stringify({ type: 'GAME_ACTION', action: { type: 'ACK_CARD' } }));
   ```
   Confira no `STATE` de cada bot que segredos alheios não aparecem.
3. Navegador: Firefox headless com WebDriver BiDi (o Firefox normal do usuário pode estar aberto;
   use perfil próprio num diretório que o snap enxerga):
   `firefox --headless --remote-debugging-port 9333 --no-remote --profile ~/snap/firefox/common/<perfil>`.
   Conecte em `ws://127.0.0.1:9333/session` e mande `session.new`, `browsingContext.create {type:'tab'}`,
   `browsingContext.setViewport {width:400,height:860}`, `browsingContext.navigate {wait:'complete'}`,
   `script.evaluate {awaitPromise:true}` (clicar: `button.click()`; digitar em input React: setter
   nativo de `value` + `dispatchEvent(new Event('input', {bubbles:true}))`) e
   `browsingContext.captureScreenshot`. Termine com `session.end` (só 1 sessão por vez).
   Dicas: `innerText` aplica `uppercase` do CSS — compare com `textContent`; aba em segundo plano
   atrasa timers/animações; `sessionStorage` é por aba (cada aba = um `playerId`), `localStorage` é
   compartilhado. Tema escuro: `localStorage['pg.theme']='dark'` e recarregar (também testa a
   retomada da sessão).
4. Fluxo local: `/jogar/<modo>?tipo=local` → nomes → "Criar partida" → lobby → "Começar".
   Online: `/jogar/<modo>?tipo=online` → nome → "Criar sala online" → bots entram com o código
   de `location.pathname`.
5. Pare tudo que você iniciou (pelo PID/grupo) e apague screenshots/perfis temporários.
