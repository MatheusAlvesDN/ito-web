import { Check, Copy, Sparkles, Volume2, VolumeX } from "lucide-react";
import { getFidelityStatus, type TranslationStep } from "../data";
import { Card, IconButton, cx } from "../../../ui";
import SectionTitle from "./SectionTitle";
import TranslationStepCard from "./TranslationStepCard";

interface TranslationResultsProps {
  steps: TranslationStep[];
  fidelityScore: number | null;
  finalTranslation: string;
  isPlayingAudioStep: number | null;
  copiedText: string | null;
  onTTS: (text: string, locale: string, index: number) => void;
  onCopy: (text: string) => void;
}

// Resultado final + fidelidade + histórico de passos.
export default function TranslationResults({
  steps,
  fidelityScore,
  finalTranslation,
  isPlayingAudioStep,
  copiedText,
  onTTS,
  onCopy,
}: TranslationResultsProps) {
  const fidelity = fidelityScore !== null ? getFidelityStatus(fidelityScore) : null;
  const done = steps[steps.length - 1]?.status === 'success';
  return (
    <Card as="section" className="space-y-5 animate-fade-in" aria-labelledby="tr-result">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <SectionTitle id="tr-result" icon={<Sparkles />}>Resultado</SectionTitle>
        {fidelity && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Fidelidade:</span>
            <span className={cx("rounded-full border px-2.5 py-0.5 font-display text-sm font-black", fidelity.color)}>{fidelityScore}%</span>
          </div>
        )}
      </div>

      {done && (
        <div className="space-y-4" aria-live="polite">
          {fidelity && (
            <div className={cx("space-y-1 rounded-xl border p-4", fidelity.color)}>
              <h3 className="font-display text-sm font-bold">{fidelity.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{fidelity.desc}</p>
            </div>
          )}

          <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
            <div className="mb-2 flex items-start justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span aria-hidden>🇧🇷</span> Tradução final (português)
              </span>
              <div className="flex items-center">
                <IconButton
                  size="sm"
                  aria-label={isPlayingAudioStep === -2 ? "Parar áudio" : "Ouvir tradução"}
                  icon={isPlayingAudioStep === -2 ? <VolumeX className="text-brand-strong" /> : <Volume2 />}
                  onClick={() => onTTS(finalTranslation, 'pt-BR', -2)}
                  className="[&_svg]:h-4 [&_svg]:w-4"
                />
                <IconButton
                  size="sm"
                  aria-label={copiedText === finalTranslation ? "Copiado" : "Copiar texto"}
                  icon={copiedText === finalTranslation ? <Check className="text-success" /> : <Copy />}
                  onClick={() => onCopy(finalTranslation)}
                  className="[&_svg]:h-4 [&_svg]:w-4"
                />
              </div>
            </div>
            <p className="whitespace-pre-line text-base font-medium leading-relaxed text-ink">{finalTranslation}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted">Passo a passo</h3>
        <ol className="space-y-3">
          {steps.map((step, idx) => (
            <TranslationStepCard key={idx} step={step} index={idx} isPlayingAudioStep={isPlayingAudioStep} onTTS={onTTS} />
          ))}
        </ol>
      </div>
    </Card>
  );
}
