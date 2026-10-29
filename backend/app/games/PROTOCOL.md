# Protocolo dos motores de jogo

Os motores (`backend/app/games/*.py`) são puros: a sala recebe `GAME_ACTION{action, asSeat?}`,
monta um `Actor` e chama `engine.handle_action(actor, action, content)`. O campo `game` do STATE
enviado a cada socket é `engine.view_for(viewer)`. Os docstrings de cada módulo são a fonte
principal; este arquivo junta tudo.

## Convenções gerais

- JSON em **camelCase**. Ações: `{"type": "NOME", ...payload}`. Campos extras são ignorados.
- **Viewers**
  - *online*: `Viewer(seat_ids={seuAssento}, local=False)` — vê só os próprios segredos.
  - *local* (Pass and Play): `Viewer(seat_ids={todos}, local=True)` — um aparelho; segredos só
    aparecem na carta da vez (`card`) enquanto revelada (exceto Quem Sou Eu: tudo visível).
  - *espectador*: `None` — nenhum segredo.
- **Pass and Play**: o aparelho é o líder e controla todos os assentos. Ações de assento vão com
  `asSeat` (vira `actor.seat_id`). Distribuição de cartas: `REVEAL_CARD` (só o assento da vez;
  sem `asSeat` = o da vez) → `HIDE_CARD` (opcional) → `NEXT_CARD` (exige que a carta tenha sido vista).
- **Online**: cada socket é um assento. `ACK_CARD` marca "já vi minha carta".
- **Cronômetro** (`timer`): `{duration, deadline, paused, remaining}`, segundos. `deadline` está no
  relógio do servidor (compare com `serverNow` do STATE); `null` quando pausado. Ações do líder:
  `TIMER_PAUSE`, `TIMER_RESUME`, `TIMER_ADD {seconds=30}`, `TIMER_RESET` (tempo cheio, mantém
  rodando/pausado). Ao esgotar: evento `time_up`, fase não muda, `TIMER_RESUME` falha com
  `time_over` (use ADD ou RESET).
- **Distribuição** (`distribution`, só local): `{order, cursor, current, revealed, viewed, done}`.
- Toda view começa com `{mode, phase, phaseSeq, local, seats: [{id, name}]}`.
- **Erros** (`GameError` → `ERROR{code, message}`): `invalid_action`, `invalid_config`,
  `invalid_phase` ("Essa ação não está disponível agora."), `not_allowed` ("Só o líder pode fazer
  isso."), `unknown_seat`, `no_seat`, `not_your_turn`, `card_not_seen`, `no_content` ("Os temas
  escolhidos não têm conteúdo."), `not_enough_players`, `too_many_players`, além dos específicos
  de cada modo.
- **Eventos comuns**: `not_enough_players {minPlayers}` quando uma saída deixa a mesa abaixo do
  mínimo (a sala volta ao lobby).
- **Ações de conteúdo** (`content_actions`): antes delas a sala recarrega o conteúdo do banco.

---

## ITO (`classic`) — mín. 2 (3 com sabotador), nº de jogadores ≤ escala

**Config**: `scale` ∈ {50, 100, 1000} = 100 · `lives` 1..5 = 3 · `saboteur` = false.
Ações de conteúdo: `START_ORDERING`, `NEXT_CARD`. Tema `free`/`classic_free` = modo livre.

**Fases**: `init → rolling (2,5 s) → numbers → ordering → result`; com sabotador e vidas = 0:
`ordering → saboteur_voting → saboteur_reveal`.

| Ação | Payload | Quem | Fase |
|---|---|---|---|
| `DEAL` | — | líder | init |
| `ACK_CARD` | — | assento (online) | numbers |
| `REVEAL_CARD` / `HIDE_CARD` / `NEXT_CARD` | — (`asSeat`) | local | numbers (`NEXT_CARD` no último → ordering) |
| `START_ORDERING` | — | líder | numbers |
| `MOVE` | `seatId, toIndex` | líder | ordering |
| `SET_ORDER` | `order: [seatId]` | líder | ordering |
| `CHECK` | — | líder | ordering |
| `NEXT_ROUND` | — | líder | result (sem gameOver) |
| `VOTE` | `targetId` (≠ si mesmo, pode trocar) | assento (online) | saboteur_voting |
| `REVEAL_SABOTEUR` | — | líder (online) | saboteur_voting |
| `ACCUSE` | `suspectId` | líder (local) | saboteur_voting |
| `RESTART` | — | líder | qualquer (novo sabotador) |

Regras: números distintos 1..escala; certo = ordem crescente; erro custa 1 vida. Vidas 0 sem
sabotador → `result` com `gameOver`. Com sabotador → votação; mais votado único = acusado;
empate/nenhum voto = sabotador vence. Sabotador é sorteado no início e a cada `RESTART`.

**View**
```jsonc
{
  "mode": "classic", "phase": "...", "phaseSeq": 3, "local": false, "seats": [{"id": "", "name": ""}],
  "round": 1, "lives": 3, "maxLives": 3, "scale": 100, "saboteurMode": false,
  "roundSeatIds": ["..."],
  "question": {"text": "...", "themeId": "..."} | null,
  "order": ["seatId"],
  "viewed": ["seatId"],                 // numbers
  "distribution": {...} | null,         // local, numbers
  "you": {"seatId": "", "number": 42 | null, "isSaboteur": false} | null,   // online
  "card": {"seatId": "", "number": 42, "isSaboteur": false} | null,        // local, carta da vez revelada
  "numbers": {"seatId": 42} | null,     // só em result/saboteur_*
  "lastResult": {"success": true, "livesLost": 0} | null,
  "gameOver": false,
  "voting": {"voteCounts": {"seatId": 2}, "votedSeatIds": [], "myVote": "seatId" | null} | null,
  "saboteurReveal": {"saboteurId": "", "suspectId": "" | null, "groupWon": true, "voteCounts": {}} | null
}
```
- online: `you` com o próprio número (a partir de `numbers`) e o próprio `isSaboteur`; `card` null.
- local: `you` null; `card` só da carta da vez revelada.
- espectador: `you`/`card` null, `myVote` null.

**Eventos**: `round_result {success, lives}`, `saboteur_result {groupWon}`.

---

## Impostor (`impostor`) — mín. 3

**Config**: `discussionSeconds` 30..900 = 120. Ação de conteúdo: `NEW_ROUND`.

**Fases**: `distribution → discussion → reveal`.

| Ação | Payload | Quem | Fase |
|---|---|---|---|
| `ACK_CARD` | — | assento (online) | distribution |
| `REVEAL_CARD` / `HIDE_CARD` / `NEXT_CARD` | — (`asSeat`) | local | distribution (`NEXT_CARD` no último → discussion) |
| `START_DISCUSSION` | — | líder | distribution |
| `TIMER_*` | ver acima | líder | discussion |
| `REVEAL` | — | líder | discussion |
| `JUDGE` | `impostorGuessed: bool` | líder | reveal (pode corrigir) |
| `NEW_ROUND` | — | líder | qualquer |

O cronômetro começa rodando ao entrar em `discussion`. `JUDGE`: true → `impostor_won`, false →
`group_won`.

**View**
```jsonc
{
  "mode": "impostor", "phase": "...", "phaseSeq": 1, "local": false, "seats": [...],
  "round": 1, "roundSeatIds": ["..."],
  "viewed": ["seatId"],                       // distribution
  "distribution": {...} | null,               // local, distribution
  "you": {"seatId": "", "question": "...", "isImpostor": false} | null,  // online, assento da rodada
  "card": {"seatId": "", "question": "...", "isImpostor": false} | null, // local, carta da vez revelada
  "timer": {...} | null,                      // discussion
  "reveal": {"impostorId": "", "honestQuestion": "", "impostorQuestion": "",
             "outcome": "pending" | "impostor_won" | "group_won"} | null,  // só em reveal
  "history": [{"round": 1, "impostorId": "", "outcome": "group_won"}]
}
```
- online: só a própria pergunta; impostor e as duas perguntas só em `reveal`.
- espectador: sem `you`/`card`.

**Eventos**: `time_up`, `round_aborted {reason: "impostor_left"}` (impostor saiu → nova rodada
automática se ainda houver ≥ 3). Quem entra no meio joga a partir da próxima rodada.

---

## Quem Sou Eu (`whoami`) — mín. 2

**Config**: `roundSeconds` 30..900 = 120. Ações de conteúdo: `REROLL`, `NEXT_MATCH`, `RESET_ALL`.

**Fases**: `reveal` (só local) → `playing` → `match_ended` → (`overall`). Online começa em `playing`.

| Ação | Payload | Quem | Fase |
|---|---|---|---|
| `REVEAL_CARD` / `HIDE_CARD` / `NEXT_CARD` | — (`asSeat`) | local | reveal (`NEXT_CARD` no último → playing) |
| `REROLL` | `seatId` | local: carta da vez revelada · playing: líder | reveal, playing |
| `NEXT_ROUND` | — | líder | playing (cronômetro volta cheio e pausado) |
| `TIMER_*` | ver acima | líder | playing (começa pausado) |
| `TOGGLE_GUESSED` | `seatId` | líder; online: qualquer assento ≠ `seatId` | playing |
| `ADJUST_ROUNDS` | `seatId, delta` (mín. 1) | líder | playing, match_ended |
| `END_MATCH` | — | líder | playing |
| `NEXT_MATCH` | — | líder | match_ended, overall |
| `SHOW_OVERALL` | — | líder | match_ended |
| `RESET_ALL` | — | líder | qualquer |

Marcar acerto: `roundsToGuess = rodada atual`; desmarcar limpa. `END_MATCH`: quem não acertou
recebe `roundsToGuess = rodada` (penalidade); a partida vai para `history`. Personalidades não se
repetem entre assentos enquanto o pool permitir.

**View**
```jsonc
{
  "mode": "whoami", "phase": "...", "phaseSeq": 1, "local": false, "seats": [...],
  "matchNumber": 1, "round": 1,
  "players": [{"seatId": "", "name": "", "personality": "..." | null, "guessed": false, "roundsToGuess": null}],
  "distribution": {...} | null,               // local, reveal
  "card": {"seatId": "", "personality": ""} | null,  // local, carta da vez revelada
  "timer": {...} | null,                      // playing
  "history": [{"matchNumber": 1, "results": [{"seatId": "", "name": "", "personality": "",
               "guessed": true, "roundsToGuess": 2}]}],
  "overall": [{"seatId": "", "name": "", "matchesGuessed": 1, "totalRounds": 3, "totalMatches": 1,
               "history": [{"matchNumber": 1, "rounds": 3, "guessed": true, "personality": ""}]}] | null
             // match_ended/overall; ordem: matchesGuessed desc, totalRounds asc
}
```
- online: `personality` do **próprio** assento é `null` até `match_ended`/`overall`; os outros visíveis.
- local: todas as personalidades visíveis sempre.
- espectador (`None`): nenhuma personalidade (`null` em `players`, `history` e `overall`).

**Eventos**: `time_up`, `guessed {seatId, guessed}`. Quem entra online em `playing` recebe uma
personalidade na hora; nos outros casos entra na próxima partida.

---

## O Que Você Sabe (`whatdoyouknow`) — mín. 3, sem fim

**Config**: nenhuma. Ação de conteúdo: `NEXT_ROUND`.

**Fases**: `question → scoring → leaderboard → question …` (todas as ações são do líder).

| Ação | Payload | Fase |
|---|---|---|
| `GO_SCORING` | — | question |
| `TOGGLE_WINNER` | `seatId` (≠ alvo) | scoring |
| `CONFIRM` | — | scoring → leaderboard |
| `NEXT_ROUND` | — | leaderboard (ou question, para pular) |

Pontuação: alvo +1 por acertador; cada acertador +1. Alvo sorteado sem repetir até todos irem;
perguntas sem repetir até esgotar.

**View** (igual para todos)
```jsonc
{
  "mode": "whatdoyouknow", "phase": "...", "phaseSeq": 1, "local": false, "seats": [...],
  "round": 1, "targetId": "seatId" | null,
  "question": {"text": "...", "themeId": "..."} | null,
  "winners": ["seatId"],
  "scores": {"seatId": 0},
  "ranking": [{"seatId": "", "name": "", "score": 0}],
  "lastGains": {"seatId": 1} | null
}
```

**Eventos**: `round_scored {targetId, winners, gains}`, `target_changed {targetId}` (alvo saiu →
novo alvo e volta para `question`). Quem sai deixa o placar e a fila; quem entra começa com 0.
