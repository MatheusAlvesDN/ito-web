# Party Games

Jogos de festa para jogar com os amigos, no mesmo celular (**Pass and Play**) ou cada um no seu (**Online**, numa sala com código de 4 letras). Todo o jogo roda no servidor: o navegador só mostra o que cada jogador pode ver, então segredos (o número do ITO, quem é o impostor) não vazam para os outros aparelhos.

## Modos

| Modo | Jogadores | Resumo |
|---|---|---|
| **ITO** | 2+ | Cada um recebe um número secreto e dá dicas sobre um tema; a equipe ordena as cartas sem revelar os números. Escala (1–50, 1–100, 1–1000), vidas e modo **Sabotador** opcional (votação quando as vidas acabam). |
| **Impostor** | 3+ | Todos recebem a mesma pergunta, menos o impostor, que recebe uma parecida. Discussão com cronômetro e revelação. |
| **Quem Sou Eu?** | 2+ | Cada um tem um personagem que os outros veem; descubra o seu com perguntas. Online, você nunca vê a própria carta até o fim da partida. |
| **O Que Você Sabe?** | 3+ | Um jogador responde sobre si mesmo; quem acertar a resposta pontua. |
| **Tradutor maluco** | — | Ferramenta extra: passa uma frase por vários idiomas e mostra como ela volta. |

Os temas e o conteúdo (perguntas, cenários, personagens) ficam num banco SQLite local e são editados pelo **painel de administração** em `/admin`.

## Arquitetura

```
frontend (React 19 + Vite + Tailwind)            backend (FastAPI, um processo)
 src/app/        rotas, tema claro/escuro          app/api/v1/games.py       jogos e temas ativos (público)
 src/ui/         design system marrom/laranja      app/api/v1/admin/         painel admin (login + CRUD)
 src/features/   home, play (lobby/sala), games,   app/games/                um motor por modo (regras)
                 admin, translator                 app/websockets/           salas e protocolo (/ws)
 src/lib/        api, adminApi, room client        alembic/                  migrações do banco
```

- **Motores de jogo** (`backend/app/games/`): lógica pura e testável de cada modo. Regras, ações e o formato do que cada jogador recebe estão em [`backend/app/games/PROTOCOL.md`](backend/app/games/PROTOCOL.md).
- **Salas** (`backend/app/websockets/`): criação e entrada em salas, reconexão (o jogador volta para a mesma vaga ao recarregar a página), troca de líder e cronômetros no servidor. O contrato com o cliente está em [`backend/app/websockets/PROTOCOL.md`](backend/app/websockets/PROTOCOL.md).
- **Pass and Play** também passa pelo servidor: é uma sala com um único aparelho controlando todos os jogadores, então o servidor precisa estar rodando.
- **Frontend**: o design system está documentado em [`src/ui/README.md`](src/ui/README.md) e as telas de jogo em [`src/features/games/README.md`](src/features/games/README.md).

## Como executar

### Linux / macOS
```bash
./run.sh                 # instala o que faltar e inicia backend + frontend (Ctrl+C para os dois)
./run.sh admin <usuario> # cria uma conta de admin do painel (pede a senha)
./run.sh seed            # popula o banco (só se estiver vazio)
./run.sh seed --reset    # apaga o conteúdo dos jogos e repopula (contas de admin ficam)
./run.sh backend         # só o backend  (http://localhost:8000, docs em /docs)
./run.sh frontend        # só o frontend (http://localhost:5173)
```

### Windows
Use `setup.bat` (instalação) e `run.bat` (menu para iniciar). Para criar um admin: `npm run admin -- <usuario>`.

### Manualmente
```bash
npm install
python -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt   # Windows: backend\.venv\Scripts\pip
npm run seed
npm run admin -- <usuario>
npm run backend      # terminal 1
npm run dev          # terminal 2
```
O banco é migrado automaticamente (Alembic) ao iniciar o backend. O Vite redireciona `/api` e `/ws` para o backend.

## Painel de administração

Acesse `http://localhost:5173/admin` com uma conta criada por `./run.sh admin <usuario>`. Nele dá para:
- ativar/desativar jogos e editar nome e descrição;
- criar, editar, ativar/desativar e apagar temas;
- adicionar, editar, ativar/desativar e apagar itens de cada tema, inclusive **importar em lote** (uma linha por item; no Impostor, `pergunta dos honestos | variação 1; variação 2`);
- gerenciar outras contas de admin.

As alterações valem a partir da próxima rodada das partidas em andamento.

## Testes
```bash
npm run test:backend          # motores, salas/WebSocket, admin e API (pytest)
npx tsc -b && npm run lint    # typecheck e lint do frontend
npm run build                 # build de produção
```

## Variáveis de ambiente (opcionais)
- `backend/.env`: `DATABASE_URL`, `CORS_ORIGINS` (lista JSON das origens permitidas em produção).
- `.env.local` (frontend): `VITE_WS_URL`, se o backend estiver em outro domínio.
