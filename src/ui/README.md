# UI kit — Party Games

Tudo que é visual no app novo sai daqui. Importe do barrel:

```tsx
import { Button, Card, Screen, Input, Modal, cx } from '../../ui';
```

## Tokens (cores)

Definidos em `src/index.css` como canais RGB (`--c-<nome>: r g b`) e mapeados no
`tailwind.config.js`. Trocam sozinhos entre claro/escuro — **não use `slate-*`,
`blue-*` etc. no código novo, nem `dark:`** (o `dark:` só pega o escuro explícito,
não o "seguir sistema").

| Classe Tailwind | Uso |
|---|---|
| `bg-bg` | fundo da página (creme / café escuro) |
| `bg-surface`, `bg-surface-2` | cards / blocos internos, inputs, trilhos |
| `text-ink` | texto principal |
| `text-muted` | texto secundário (≥ 4.5:1 no bg e surface) |
| `border-line` | bordas e divisórias |
| `wood` | marrom de apoio (ícones, badges, detalhes) |
| `bg-brand`, `hover:bg-brand-hover` | laranja da marca (fundos, botão primário) |
| `text-brand-ink` | texto **sobre** fundo `brand` |
| `text-brand-strong` | laranja para **texto/ícone** sobre bg/surface (contraste ok) |
| `success`, `danger`, `warning` | estados (texto ok sobre bg/surface; com `/10` como fundo) |

Opacidade funciona: `bg-brand/10`, `border-line/70`, `bg-ink/5` (hover neutro).
Use a escala padrão de opacidade (5, 10, 15, 20, 25, 30…).
Fontes: `font-display` (Outfit, títulos/botões) e `font-sans` (Plus Jakarta Sans, padrão).
Sombras: `shadow-raised` (cards), `shadow-overlay` (modais).
Helpers: `cx(...)`, `focusRing` (anel laranja no foco por teclado), `buttonClasses({variant,size})`, `fieldControl`.

## Tema

`src/app/theme.tsx` (`ThemeProvider`) + `src/app/themeContext.ts` (`useTheme()` →
`{ mode: 'system'|'light'|'dark', resolved, setMode }`). Salvo em `localStorage['pg.theme']`
e aplicado como `<html data-theme="…">`. `<ThemeToggle />` alterna os três modos.

## Componentes

| Componente | Props principais |
|---|---|
| `Screen` | `title`, `subtitle`, `back` (rota ou função), `right` (slot), `header` (substitui título), `footer` (rodapé fixo c/ safe-area), `width: narrow\|wide\|full`. Ocupa 100% da altura; só o corpo rola. **Toda página deve usar.** |
| `Button` | `variant: primary\|secondary\|ghost\|danger`, `size: sm\|md\|lg`, `loading`, `fullWidth`, `leftIcon`, `rightIcon`; com `to` vira `<Link>` |
| `IconButton` | `aria-label` (obrigatório), `icon`, `variant: ghost\|soft\|solid`, `size`, `to?` |
| `Card` | `padding: none\|sm\|md\|lg`, `tone: raised\|sunken\|brand`, `as: div\|section\|article\|li` |
| `Field` | `label`, `hint`, `error`, `hideLabel`; children é função que recebe `{id, aria-describedby, aria-invalid}` |
| `Input`, `TextArea` | props nativas + `label`, `hint`, `error`, `hideLabel`, `wrapperClassName` |
| `Select` | idem + `options: {value,label}[]` (ou `<option>` filhos) |
| `Toggle` | `checked`, `onChange(bool)`, `label?`, `description?` (sem label → `aria-label`) |
| `Stepper` | `value`, `onChange`, `label` (aria), `showLabel`, `min`, `max`, `step`, `format` |
| `SegmentedControl` | `options: {value,label,icon?}[]`, `value`, `onChange`, `aria-label` (setas do teclado) |
| `Badge` | `tone: neutral\|brand\|wood\|success\|danger\|warning`, `size`, `icon` |
| `Modal` | `open`, `onClose`, `title`, `description`, `footer`, `size`, `dismissible`. Foco preso, Esc fecha, devolve o foco; `data-autofocus` escolhe o 1º foco. Bottom sheet no celular |
| `Spinner` | `size`, `label` (leitor de tela) |
| `Skeleton` | `className` (defina altura/largura) |
| `EmptyState` | `icon`, `title`, `description`, `action`, `tone: neutral\|danger` |
| `PlayerAvatar` | `name`, `avatar?` ("estilo:semente"), `size: xs…xl`, `highlight`, `decorative` |
| `AppIcon` | `name` (ícone salvo no banco, via `utils/iconMap`) |
| `ThemeToggle` | — |

## Exemplos

```tsx
<Screen title="Preparar partida" back="/" right={<ThemeToggle />}
  footer={<Button fullWidth size="lg" loading={busy} onClick={start}>Começar</Button>}>
  <Card className="space-y-4">
    <Input label="Seu nome" hint="Aparece para os outros jogadores" error={err} value={name} onChange={e => setName(e.target.value)} />
    <Stepper label="Vidas" showLabel value={lives} min={1} max={5} onChange={setLives} />
    <Toggle label="Sabotador" description="Um jogador tenta atrapalhar" checked={sab} onChange={setSab} />
    <SegmentedControl aria-label="Tipo" value={kind} onChange={setKind}
      options={[{ value: 'local', label: 'Mesmo celular' }, { value: 'online', label: 'Online' }]} />
  </Card>
</Screen>

<Modal open={open} onClose={() => setOpen(false)} title="Sair da sala?"
  footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Ficar</Button>
           <Button variant="danger" onClick={leave}>Sair</Button></>} />
```

Toasts: `import { toast } from 'sonner'` — o `<Toaster>` global já usa os tokens.
API: `src/lib/api.ts` (`apiGet`, `apiSend`, `ApiError`, `getGames`) e `src/lib/useGames.ts` (`useGames`, `useGame(id)`, `invalidateGames`).
