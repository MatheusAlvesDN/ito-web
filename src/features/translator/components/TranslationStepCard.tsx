import type { ReactNode } from "react";
import { ChevronRight, Volume2, VolumeX } from "lucide-react";
import type { TranslationStep } from "../data";
import { Badge, IconButton, Spinner, cx } from "../../../ui";

interface TranslationStepCardProps {
  step: TranslationStep;
  index: number;
  isPlayingAudioStep: number | null;
  onTTS: (text: string, locale: string, index: number) => void;
}

function TextBlock({ label, text, playing, onPlay, lang }: { label: string; text: string; playing: boolean; onPlay: () => void; lang: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <IconButton size="sm" aria-label={playing ? `Parar áudio: ${label}` : `Ouvir ${label}`} icon={playing ? <VolumeX className="text-brand-strong" /> : <Volume2 />} onClick={onPlay} className="h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5" />
      </div>
      <p lang={lang} className="rounded-lg border border-line/70 bg-surface-2 p-2.5 font-mono text-xs leading-relaxed text-ink">
        {text}
      </p>
    </div>
  );
}

// Um passo da cadeia (de → para) com status, entrada e saída.
export default function TranslationStepCard({ step, index: idx, isPlayingAudioStep, onTTS }: TranslationStepCardProps) {
  const isRunning = step.status === 'running';
  const isSuccess = step.status === 'success';
  const isError = step.status === 'error';
  const isPending = step.status === 'pending';

  let status: ReactNode = null;
  if (isRunning) status = <Badge tone="brand" icon={<Spinner size="sm" label="Traduzindo" />}>Traduzindo…</Badge>;
  if (isSuccess) status = <Badge tone="success">Sucesso</Badge>;
  if (isError) status = <Badge tone="danger">Falha</Badge>;
  if (isPending) status = <Badge tone="neutral">Aguardando</Badge>;

  return (
    <li
      className={cx(
        "rounded-xl border p-3.5 transition-colors",
        isRunning && "border-brand/40 bg-brand/5",
        isSuccess && "border-line bg-surface",
        isError && "border-danger/30 bg-danger/5",
        isPending && "border-line/60 bg-surface-2/40 opacity-80",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-ink">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">#{idx + 1}</span>
          <span className="flex items-center gap-1">
            <span aria-hidden>{step.fromLang.flag}</span>
            <span className="font-mono text-[10px] uppercase text-muted">{step.fromLang.code}</span>
          </span>
          <ChevronRight aria-label="para" className="h-3.5 w-3.5 text-muted/60" />
          <span className="flex items-center gap-1">
            <span aria-hidden>{step.toLang.flag}</span>
            <span className="font-mono text-[10px] uppercase text-muted">{step.toLang.code}</span>
          </span>
        </div>
        {status}
      </div>

      {(isSuccess || isRunning) && (
        <div className="mt-3 space-y-3 border-t border-line/70 pt-3">
          <TextBlock
            label={`Entrada (${step.fromLang.name})`}
            text={step.inputText}
            lang={step.fromLang.locale}
            playing={isPlayingAudioStep === idx * 2}
            onPlay={() => onTTS(step.inputText, step.fromLang.locale, idx * 2)}
          />
          {isSuccess && (
            <TextBlock
              label={`Saída (${step.toLang.name})`}
              text={step.outputText}
              lang={step.toLang.locale}
              playing={isPlayingAudioStep === idx * 2 + 1}
              onPlay={() => onTTS(step.outputText, step.toLang.locale, idx * 2 + 1)}
            />
          )}
        </div>
      )}

      {isError && (
        <p role="alert" className="mt-2 border-t border-danger/20 pt-2 text-xs leading-relaxed text-danger">
          {step.error || 'Ocorreu um erro ao processar este passo da tradução.'}
        </p>
      )}
    </li>
  );
}
