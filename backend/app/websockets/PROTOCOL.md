# Protocolo do WebSocket `/ws` (salas)

Contrato entre o frontend e o servidor. O servidor é **autoritativo**: o cliente nunca calcula
regra de jogo; ele manda intenções e desenha o `STATE` que recebe. O formato do campo `game` e
as ações de cada modo estão em [`backend/app/games/PROTOCOL.md`](../games/PROTOCOL.md).

Código: `protocol.py` (mensagens do cliente), `room.py` (sala/motor), `connection_manager.py`
(entrada, reconexão, saída), `endpoint.py` (loop do socket), `catalog.py` (banco).

## Convenções

- Todas as mensagens são JSON com `type`. Campos desconhecidos são ignorados.
- Limite de tamanho: `WS_MAX_MESSAGE_BYTES` (256 kB) → `ERROR message_too_large`.
- Mensagem que não é JSON ou não passa na validação → `ERROR invalid_message`.
- Um socket está em **no máximo uma sala**. `CREATE_ROOM`/`JOIN_ROOM` com o socket já numa sala
  primeiro **sai** da sala atual (como `LEAVE_ROOM`).
- `playerId`: id estável gerado pelo cliente (guarde em `sessionStorage`/`localStorage`), 1..64
  caracteres. É ele que permite reconectar. Online, **o id do assento é o próprio `playerId`**.
- `playerName`: 1..40 caracteres (espaços nas pontas são removidos). `avatar`: string ≤ 200 ou `null`.
- Ids de tema: a sala guarda o **id global** do tema (`Theme.id`, ex. `classic_anime`) — o mesmo
  `id` que `GET /api/v1/games` devolve em `themes[].id`. `SELECT_THEMES` também aceita o id original
  (`anime`) e converte. No ITO, `free`/`classic_free` (modo livre) é sempre aceito e vira `classic_free`.

## Cliente → servidor

| `type` | Campos | Quem / quando |
|---|---|---|
| `CREATE_ROOM` | `playerId, playerName, avatar?, kind: "online"\|"local" = "online", localPlayers?: [nome]` | qualquer socket. Quem cria é o líder. `localPlayers` (2..16 nomes distintos, sem diferenciar maiúsculas) só faz sentido em `local`. |
| `JOIN_ROOM` | `roomCode` (4..8, sem diferenciar maiúsculas), `playerId, playerName, avatar?` | entra numa sala online, ou reconecta (mesmo `playerId`). Em sala `local` só o próprio aparelho (mesmo `playerId`) pode reconectar. |
| `SELECT_MODE` | `mode`: `classic` \| `impostor` \| `whoami` \| `whatdoyouknow` | líder, lobby. O jogo precisa estar ativo no banco. Trocar de modo zera `config` (padrões do modo) e `themeIds`. |
| `SET_CONFIG` | `config: {...}` (camelCase, ver config de cada modo) | líder, lobby, com modo escolhido. Campos ausentes voltam ao padrão; a sala guarda a config completa normalizada. |
| `SELECT_THEMES` | `themeIds: [id]` (≤ 30) | líder, lobby, com modo escolhido. Todos precisam ser temas **ativos** do modo; sem duplicados. |
| `SET_LOCAL_PLAYERS` | `names: [nome]` (2..16, distintos) | líder, lobby, só sala `local`. Nomes que continuam mantêm o id do assento. |
| `START_GAME` | — | líder, lobby. Valida nº de jogadores/config e carrega o conteúdo dos temas. |
| `RETURN_TO_LOBBY` | — | líder, em partida. Descarta a partida (modo/config/temas continuam). |
| `GAME_ACTION` | `action: {type, ...}`, `asSeat?` | em partida. Ver abaixo. |
| `UPDATE_AVATAR` | `avatar` | qualquer membro. |
| `SEND_REACTION` | `reaction` (1..32) | qualquer membro. Não muda o estado (só `EVENT reaction`). |
| `LEAVE_ROOM` | — | saída definitiva (sem período de graça). |
| `PING` | — | responde `{"type": "PONG", "serverNow": number}`. Funciona fora de sala. |

### `GAME_ACTION`

- `action` é a ação do modo (`{"type": "DEAL"}`, `{"type": "VOTE", "targetId": "..."}` …), ver
  `games/PROTOCOL.md`.
- **Online**: o jogador age pelo próprio assento. `asSeat` deve ser omitido (ou igual ao seu
  `playerId`); outro valor → `not_allowed`.
- **Local (Pass and Play)**: o aparelho é o líder e controla todos os assentos (`you.controls`).
  Ações de assento (`REVEAL_CARD`, `HIDE_CARD`, `NEXT_CARD` …) levam `asSeat` = id do assento
  (`l_xxxxxxxx`); id desconhecido → `unknown_seat`. Ações do líder dispensam `asSeat`. Quem decide
  o que exige assento é o motor (ex. `REVEAL_CARD` sem `asSeat` = assento da vez).
- Antes das ações de conteúdo de cada modo a sala recarrega os temas do banco (edições dos admins
  valem na próxima rodada). Se o recarregamento falhar, o motor usa o último conteúdo carregado.

## Servidor → cliente

### `STATE` (instantâneo completo, personalizado por socket)

Enviado a **todos os sockets conectados** depois de cada mudança (inclusive para quem acabou de
criar/entrar/reconectar — é a resposta a `CREATE_ROOM`/`JOIN_ROOM`).

```jsonc
{
  "type": "STATE",
  "rev": 12,                 // cresce a cada mudança; descarte STATE com rev menor que o último visto
  "serverNow": 81234.567,    // relógio do servidor (segundos), mesma base dos `deadline` do jogo
  "room": {
    "code": "ABCD",
    "kind": "online",        // "online" | "local"
    "hostId": "playerId do líder",
    "stage": "lobby",        // "lobby" | "game"
    "mode": "classic" | null,
    "config": {"scale": 100, "lives": 3, "saboteur": false},   // {} sem modo
    "themeIds": ["classic_anime"],
    "players": [{"id": "", "name": "", "avatar": null, "connected": true}],  // ordem de entrada
    "localSeats": [{"id": "l_1a2b3c4d", "name": "Ana"}]                      // [] online
  },
  "you": {
    "playerId": "",
    "isHost": true,
    "controls": ["seatId"]   // online: [playerId]; local (aparelho): todos os localSeats
  },
  "game": { ... } | null      // engine.view_for(...) do modo; null no lobby
}
```

- O `game` já vem filtrado para quem recebe: online cada um vê só os próprios segredos; o aparelho
  local vê a visão "Pass and Play" (segredo só na carta da vez). Online, assentos `game.seats[].id`
  são `playerId`s.
- `rev` é da sala; o `STATE` sempre é completo — não há patches.

### `EVENT` (efêmero: som, toast, animação)

`{"type": "EVENT", "name": "...", "data": {...}}` — chega **depois** do `STATE` da mesma mudança.

| `name` | `data` | Quando |
|---|---|---|
| `player_joined` | `{playerId, name}` | alguém entrou |
| `player_reconnected` | `{playerId, name}` | voltou dentro do período de graça |
| `player_disconnected` | `{playerId, name}` | conexão caiu (continua na sala até a graça acabar) |
| `player_left` | `{playerId, name}` | saiu (`LEAVE_ROOM` ou fim da graça) |
| `host_changed` | `{hostId}` | líder saiu; o 1º jogador conectado vira líder |
| `reaction` | `{playerId, name, reaction}` | `SEND_REACTION` |
| `game_started` | `{mode}` | `START_GAME` |
| `returned_to_lobby` | `{reason: "host" \| "not_enough_players"}` | partida descartada |
| eventos dos motores | ver `games/PROTOCOL.md` | `time_up`, `round_result`, `saboteur_result`, `round_scored`, `target_changed`, `round_aborted`, `guessed`, `not_enough_players {minPlayers}` … |

Eventos de motor dirigidos a um assento vão só para quem o controla (online: aquele jogador;
local: o aparelho).

### `ERROR`

`{"type": "ERROR", "code": "...", "message": "texto em português para mostrar"}` — só para quem
enviou a mensagem; nada muda no estado.

Códigos da sala: `invalid_message`, `message_too_large`, `not_in_room`, `room_not_found`,
`local_room` (sala local não aceita outros jogadores), `session_replaced` (o mesmo `playerId`
entrou por outro socket; este socket deixa de estar na sala), `not_allowed` (não é o líder / agiu
por outro assento), `invalid_phase` (ação de lobby durante partida, ou de partida no lobby),
`no_mode`, `unknown_mode`, `unknown_theme`, `invalid_config`, `invalid_players`,
`duplicate_names`, `invalid_action`, `internal_error`. Do `START_GAME`: `not_enough_players`,
`too_many_players`, `no_content`. Os motores têm os seus (ver `games/PROTOCOL.md`).

### `PONG`

`{"type": "PONG", "serverNow": number}`.

## Fluxos

### Online
1. Líder: `CREATE_ROOM{kind:"online"}` → `STATE` (`room.code` para compartilhar).
2. Outros: `JOIN_ROOM{roomCode}` → `STATE` para todos + `EVENT player_joined`.
   Nomes repetidos (sem diferenciar maiúsculas) ganham sufixo: `Ana` → `Ana 2`.
3. Líder: `SELECT_MODE` → `SET_CONFIG` (opcional) → `SELECT_THEMES` → `START_GAME`.
   Na largada, **todos os jogadores da sala** (inclusive desconectados dentro da graça) viram assentos.
4. Durante a partida: `GAME_ACTION`. Quem entra no meio ganha um assento (o motor decide quando
   passa a jogar). Quem sai (ou não volta na graça) perde o assento. Se a mesa ficar abaixo do
   mínimo do modo: `EVENT not_enough_players` + `EVENT returned_to_lobby` e `stage` volta a `lobby`.
5. `RETURN_TO_LOBBY` (líder) encerra a partida.

### Pass and Play (local)
1. `CREATE_ROOM{kind:"local", localPlayers:["Ana","Bia","Caio"]}` (ou depois `SET_LOCAL_PLAYERS`).
   O aparelho é líder e único socket; `room.localSeats` traz os ids `l_xxxxxxxx`.
2. `SELECT_MODE` / `SET_CONFIG` / `SELECT_THEMES` / `START_GAME` como online.
3. Distribuição de cartas: `GAME_ACTION{action:{type:"REVEAL_CARD"}, asSeat: game.distribution.current}`
   → mostra `game.card` → `HIDE_CARD` → `NEXT_CARD` … (ver `games/PROTOCOL.md`).
4. `JOIN_ROOM` de outro `playerId` → `ERROR local_room`. O jogo local **precisa do servidor rodando**.

### Reconexão
- Guarde `playerId` e `room.code`. Ao reconectar o socket, mande `JOIN_ROOM` com o mesmo
  `playerId` (sala local também). Volta o mesmo assento e os mesmos segredos.
- Período de graça: `WS_RECONNECT_GRACE_SECONDS` (30 s) online e
  `WS_LOCAL_RECONNECT_GRACE_SECONDS` (600 s) local. Depois disso o jogador sai (`player_left`);
  se era o líder, `host_changed`; sala vazia é apagada (e `JOIN_ROOM` → `room_not_found`).
- Durante a partida o nome fica **congelado** (o `playerName` da reconexão é ignorado); no lobby a
  reconexão pode trocar o nome. O avatar enviado substitui o anterior.
- Se o mesmo `playerId` entrar por outro socket (outra aba), o socket antigo recebe
  `ERROR session_replaced` e deixa de valer.

## Cronômetros (`deadline` × `serverNow`)

`serverNow` e os `deadline` dos timers do jogo (`game.timer.deadline`) estão no **mesmo relógio do
servidor** (segundos, monotônico — não é horário Unix; não compare com `Date.now()`).

Para mostrar o tempo restante:

```ts
// ao receber um STATE:
const offset = state.serverNow - performance.now() / 1000;   // relógio do servidor - local
// a cada quadro:
const nowServer = performance.now() / 1000 + offset;
const remaining = timer.paused ? timer.remaining : Math.max(0, timer.deadline - nowServer);
```

`timer.remaining` (já calculado no momento do envio) serve diretamente quando `paused` é `true`
(`deadline` é `null`). Quando o tempo acaba o servidor manda `EVENT time_up` e um `STATE` com o
cronômetro pausado em 0 — o cliente não precisa decidir nada sozinho. `PONG.serverNow` pode ser
usado para recalibrar `offset`.
