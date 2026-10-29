import { ChevronRight, Route } from "lucide-react";
import { LANGUAGES, PRESETS } from "../data";
import { Card, cx, focusRing } from "../../../ui";
import SectionTitle from "./SectionTitle";

function LangChip({ code, flag }: { code: string; flag?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-1 py-0.5 text-[10px]">
      {flag && <span aria-hidden>{flag}</span>}
      <span className="font-mono uppercase text-muted">{code}</span>
    </span>
  );
}

const Arrow = () => <ChevronRight aria-hidden className="h-3 w-3 shrink-0 text-muted/60" />;

interface ChainPresetsCardProps {
  intermediateCodes: string[];
  isTranslating: boolean;
  onApplyPreset: (chain: string[]) => void;
}

// Cadeias prontas de idiomas.
export default function ChainPresetsCard({ intermediateCodes, isTranslating, onApplyPreset }: ChainPresetsCardProps) {
  return (
    <Card as="section" className="space-y-4" aria-labelledby="tr-presets">
      <SectionTitle id="tr-presets" icon={<Route />}>Cadeias prontas</SectionTitle>
      <div className="grid grid-cols-1 gap-2">
        {PRESETS.map((preset) => {
          const active = JSON.stringify(intermediateCodes) === JSON.stringify(preset.chain);
          const shown = preset.chain.length <= 6 ? preset.chain : preset.chain.slice(0, 4);
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onApplyPreset(preset.chain)}
              disabled={isTranslating}
              className={cx(
                "flex w-full flex-col overflow-hidden rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                focusRing,
                active ? "border-brand/60 bg-brand/10" : "border-line bg-surface-2/60 hover:border-brand/40 hover:bg-surface-2",
              )}
            >
              <span className="text-sm font-bold text-ink">{preset.name}</span>
              <span className="mt-0.5 text-xs text-muted">{preset.description}</span>
              <span className="mt-2.5 flex flex-wrap items-center gap-1">
                <LangChip code="en" />
                {shown.map((c, i) => (
                  <span key={i} className="contents">
                    <Arrow />
                    <LangChip code={c} flag={LANGUAGES.find(l => l.code === c)?.flag} />
                  </span>
                ))}
                {preset.chain.length > 6 && (
                  <>
                    <Arrow />
                    <span className="shrink-0 rounded-md border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-strong">
                      + {preset.chain.length - 4} outros
                    </span>
                  </>
                )}
                <Arrow />
                <LangChip code="pt" />
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
