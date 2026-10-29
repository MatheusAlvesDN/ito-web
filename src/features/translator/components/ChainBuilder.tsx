import { ArrowDown, ArrowUp, Dices, Layers, Play, Plus, Shuffle, Square, Trash2 } from "lucide-react";
import { LANGUAGES } from "../data";
import { Button, Card, IconButton, cx } from "../../../ui";
import SectionTitle from "./SectionTitle";

interface ChainBuilderProps {
  intermediateCodes: string[];
  isTranslating: boolean;
  canStart: boolean;
  currentStepIndex: number;
  totalSteps: number;
  onRandomChain: () => void;
  onShuffle: () => void;
  onClear: () => void;
  onChange: (index: number, code: string) => void;
  onMove: (index: number, direction: 'left' | 'right') => void;
  onAdd: (code: string, index?: number) => void;
  onRemove: (index: number) => void;
  onStart: () => void;
  onCancel: () => void;
}

const SELECTABLE = LANGUAGES.filter(l => l.code !== 'en' && l.code !== 'pt');

function EndpointNode({ tag, flag, name, code, note }: { tag: string; flag: string; name: string; code: string; note: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wood/15 font-display text-xs font-bold text-wood">{tag}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">{flag}</span>
          <span className="font-display text-sm font-bold text-ink">{name}</span>
          <span className="rounded bg-surface px-1 py-0.5 font-mono text-[10px] uppercase text-muted">{code}</span>
        </div>
        <span className="text-xs text-muted">{note}</span>
      </div>
    </li>
  );
}

// Monta a cadeia de idiomas intermediários e dispara/cancela a tradução.
export default function ChainBuilder({
  intermediateCodes,
  isTranslating,
  canStart,
  currentStepIndex,
  totalSteps,
  onRandomChain,
  onShuffle,
  onClear,
  onChange,
  onMove,
  onAdd,
  onRemove,
  onStart,
  onCancel,
}: ChainBuilderProps) {
  return (
    <Card as="section" className="space-y-5" aria-labelledby="tr-chain">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle id="tr-chain" icon={<Layers />}>Cadeia de idiomas</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onRandomChain} disabled={isTranslating} leftIcon={<Dices className="h-4 w-4" />}>
            Aleatória
          </Button>
          <Button size="sm" variant="secondary" onClick={onShuffle} disabled={isTranslating || intermediateCodes.length <= 1} leftIcon={<Shuffle className="h-4 w-4" />}>
            Embaralhar
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={isTranslating}>
            Limpar
          </Button>
        </div>
      </div>

      <ol className="flex flex-col gap-2.5" aria-label="Ordem das traduções">
        <EndpointNode tag="Ini" flag="🇺🇸" name="Inglês" code="en" note="Ponto de partida da mensagem original" />

        {intermediateCodes.map((code, idx) => {
          const currentLang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
          const label = `Idioma ${idx + 1}`;
          return (
            <li key={idx} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 pl-3 transition-colors hover:border-brand/40 animate-fade-in sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-xs font-bold text-brand-strong">
                #{idx + 1}
              </span>
              <span aria-hidden className="text-base">{currentLang.flag}</span>
              <label className="sr-only" htmlFor={`tr-lang-${idx}`}>{label}</label>
              <select
                id={`tr-lang-${idx}`}
                value={code}
                disabled={isTranslating}
                onChange={(e) => onChange(idx, e.target.value)}
                className="min-w-0 flex-1 cursor-pointer truncate rounded-lg border border-transparent bg-transparent py-1.5 pr-1 font-display text-sm font-bold text-ink hover:border-line focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed"
              >
                {SELECTABLE.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.code.toUpperCase()})
                  </option>
                ))}
              </select>
              <div className="flex shrink-0 items-center">
                <IconButton size="sm" aria-label={`Mover ${label} para cima`} icon={<ArrowUp />} onClick={() => onMove(idx, 'left')} disabled={idx === 0 || isTranslating} className="[&_svg]:h-4 [&_svg]:w-4" />
                <IconButton size="sm" aria-label={`Mover ${label} para baixo`} icon={<ArrowDown />} onClick={() => onMove(idx, 'right')} disabled={idx === intermediateCodes.length - 1 || isTranslating} className="[&_svg]:h-4 [&_svg]:w-4" />
                <IconButton size="sm" aria-label={`Inserir idioma depois de ${label}`} icon={<Plus />} onClick={() => onAdd('de', idx)} disabled={isTranslating || intermediateCodes.length >= 100} className="text-brand-strong [&_svg]:h-4 [&_svg]:w-4" />
                <IconButton size="sm" aria-label={`Remover ${label}`} icon={<Trash2 />} onClick={() => onRemove(idx)} disabled={isTranslating} className="text-danger hover:bg-danger/10 [&_svg]:h-4 [&_svg]:w-4" />
              </div>
            </li>
          );
        })}

        {intermediateCodes.length === 0 && (
          <li className="rounded-xl border border-dashed border-line bg-surface-2/50 px-4 py-6 text-center animate-fade-in">
            <p className="text-sm text-muted">A cadeia está vazia. O texto irá traduzir diretamente de Inglês para Português.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => onAdd('de')} leftIcon={<Plus className="h-4 w-4" />}>
              Adicionar idioma intermediário
            </Button>
          </li>
        )}

        <EndpointNode tag="Fim" flag="🇧🇷" name="Português" code="pt" note="Destino final da mensagem re-traduzida" />
      </ol>

      <div className="pt-1">
        {isTranslating ? (
          <Button variant="danger" size="lg" fullWidth onClick={onCancel} leftIcon={<Square className="h-5 w-5 fill-current" />}>
            Cancelar tradução (passo {currentStepIndex + 1}/{totalSteps})
          </Button>
        ) : (
          <Button size="lg" fullWidth onClick={onStart} disabled={!canStart} leftIcon={<Play className={cx("h-5 w-5 fill-current")} />}>
            Iniciar tradução em cadeia
          </Button>
        )}
        {!canStart && !isTranslating && <p className="mt-2 text-center text-xs text-muted">Escreva um texto em inglês para começar.</p>}
      </div>
    </Card>
  );
}
