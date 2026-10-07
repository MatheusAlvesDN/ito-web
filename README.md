# 🎮 PARTY GAMES - Mobile Experience

Uma plataforma premium de jogos de tabuleiro sociais (Party Games), projetada sob medida para dispositivos móveis. Com um visual sofisticado, interações táteis dinâmicas e transições fluidas, **Party Games** é o companheiro perfeito para animar encontros, festas e momentos entre amigos.

O aplicativo opera no modelo **Pass and Play** (um único celular que circula entre os jogadores), ideal para qualquer lugar e sem a necessidade de múltiplos aparelhos ou conexão à internet ativa após o carregamento.

---

## 🕹️ Modos de Jogo Inclusos

### 1. ⚡ ITO Clássico (Cooperativo)
Inspirado no aclamado jogo de cartas japonês, este modo exige sintonia e dedução do grupo.
- **Como funciona:** Cada jogador recebe um número secreto de **1 a 100**. Um tema/situação é sorteado (ex: *"O quão útil seria este objeto em um apocalipse zumbi?"*). Cada jogador deve dar uma resposta subjetiva condizente com seu número (1 para o menos útil, 100 para o mais útil).
- **O Desafio:** O grupo deve discutir e ordenar as cartas em ordem crescente de forma cooperativa, sem que ninguém revele o número exato diretamente.
- **Diferencial Técnico:** Interface de ordenação interativa com suporte total a gestos tarrastáveis (Drag and Drop) via `@dnd-kit` e linha do tempo de resultados interativa.

### 2. 👻 IMPOSTOR (Dedução e Blefe)
Um jogo de intriga, suspeitas e inteligência social para no mínimo 3 jogadores.
- **Como funciona:** A maioria dos jogadores recebe uma pergunta secreta idêntica (ex: *"Cães de Estimação"*), enquanto um deles (o Impostor sorteado) recebe uma pergunta sutilmente alterada (ex: *"Animais da Selva"*).
- **O Desafio:** Os jogadores fazem perguntas subjetivas entre si. O Impostor deve blefar e se integrar às respostas da maioria para não ser descoberto, enquanto o grupo honesto tenta farejar quem está deslocado do contexto real.
- **Diferencial Técnico:** Layout imersivo de revelação de papel com gradientes neons, cards de discussão estilo sala de bate-papo futurista e painel revelador de identidade.

### 3. 🔍 QUEM SOU EU? (Adivinhação Casual)
O clássico jogo da "carta na testa" adaptado digitalmente.
- **Como funciona:** Os participantes preparam as cartas na tela e o jogador da vez encosta o celular na testa sem olhar. Os demais visualizam qual personagem ele tirou (ex: *"Harry Potter"*, *"Darth Vader"* ou figuras históricas/populares).
- **O Desafio:** O jogador da vez faz perguntas de Sim/Não ou recebe dicas subjetivas do grupo para tentar descobrir sua própria identidade secreta.
- **Diferencial Técnico:** Telas de aviso anti-olhada ("Atenção: Não olhe para a tela!"), cards de personagem flutuantes com gradientes imersivos e controle tátil de acertos/pontuação fluida.

### 4. 💬 O QUE VOCÊ SABE? (Perguntas e Convivência)
Um jogo para quebrar o gelo, testar afinidades e descobrir curiosidades sobre os amigos.
- **Como funciona:** Perguntas provocativas ou engraçadas são apresentadas para o grupo ou para um jogador da vez (ex: *"Qual é o meu maior medo irracional?"*, *"O que eu faria primeiro se ganhasse na loteria?"*).
- **O Desafio:** Os amigos debatem e tentam adivinhar a resposta real ou comparar percepções sobre a personalidade de cada um.
- **Diferencial Técnico:** Suporte a geração ilimitada de temas via IA (Google Gemini), temas visuais dedicados em tons Rose/Pink e interface responsiva de cards de conversa.

### 5. 📞 TELEFONE SEM FIO / TRADUTOR (Cadeia de Idiomas)
O clássico telefone sem fio, mas potencializado pela inteligência artificial e tradução em cadeia.
- **Como funciona:** Uma frase inicial (poesia, ditado popular ou citação) passa por uma sequência automática de traduções entre diversos idiomas ao redor do mundo (ex: Português → Alemão → Japonês → Árabe → Português).
- **O Desafio:** Ver como o significado original é completamente distorcido e transformado em algo hilário ao retornar para o idioma de origem.
- **Diferencial Técnico:** Geração inteligente de frases com IA, visualização animada de bandeiras e idiomas intermediários, além de presets de rotas globais.

---

## 🎨 Design System e Estética Premium

O aplicativo foi completamente reformulado para proporcionar uma experiência **Premium e Moderna**:
- **Harmonia Visual:** Interface de alto contraste projetada em Slate-950 (fundo escuro profundo) com destaques e neon adaptativos para cada modo de jogo (Amarelo/Ouro para Clássico, Roxo/Violeta para Impostor, Esmeralda/Teal para Quem Sou Eu, Rose/Pink para O Que Você Sabe? e Azul/Blue para Telefone Sem Fio).
- **Tipografia Moderna:** Integração refinada do Google Fonts, utilizando as famílias **Outfit** (títulos marcantes e arrojados) e **Plus Jakarta Sans** (texto de leitura e botões com excelente ergonomia visual).
- **Efeito Glassmorphism:** Cabeçalhos, alertas e menus flutuantes implementados com desfoque de fundo inteligente (`backdrop-blur-md`) e bordas translúcidas finas, dando profundidade tridimensional.
- **Layout Responsivo Flex (`shrink-0`):** Nova arquitetura que bloqueia rolagens concorrentes indesejadas (`100dvh` / `overflow-hidden` global) e posiciona os botões principais de rodapé em layout flexível nativo. Isso assegura que **nenhum botão ou elemento seja cortado em smartphones menores** e as listas internas rolem de forma independente e leve.
- **Animações Fluidas & Áudio Sintético:** Efeitos de flip de cartas 3D simuladas por CSS, sons de vitória, suspense e clique via Web Audio API (`audioService.ts`), além de movimentos suaves de entrada (`animate-fade-in` e `animate-float`) para feedbacks táteis naturais.

---

## 🛠️ Stack Tecnológica

O projeto foi modernizado para uma arquitetura Web completa com backend em Python:
1. **Frontend:** React 19 + TypeScript + Tailwind CSS v3 + Vite.
2. **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 + WebSockets.
3. **Banco de Dados:** SQLite (desenvolvimento) / PostgreSQL (produção).
4. **Drag & Drop:** `@dnd-kit/core` e `@dnd-kit/sortable`.
5. **Multiplayer Online:** Salas e sincronização em tempo real via WebSockets.

---

## 🚀 Como Executar o Projeto

### 1. Iniciar o Backend em Python:
No diretório raiz:
```bash
npm run backend
```
Isso iniciará a API FastAPI em `http://localhost:8000` com documentação interativa em `http://localhost:8000/docs`.

*(Opcional) Para repopular o banco de dados inicial a qualquer momento:*
```bash
npm run seed
```

### 2. Iniciar o Frontend Web:
Em outro terminal no diretório raiz:
```bash
npm run dev
```
Acesse `http://localhost:5173` no seu navegador. As chamadas `/api` e conexões `/ws` são automaticamente direcionadas para o backend via proxy.

