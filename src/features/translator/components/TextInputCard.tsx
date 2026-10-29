import { FileText, PenLine } from "lucide-react";
import { TEXT_EXAMPLES } from "../data";
import { Card, TextArea, cx, focusRing } from "../../../ui";
import SectionTitle from "./SectionTitle";

interface TextInputCardProps {
  inputText: string;
  isTranslating: boolean;
  onInputChange: (text: string) => void;
}

// Texto de entrada (inglês) + exemplos rápidos.
export default function TextInputCard({ inputText, isTranslating, onInputChange }: TextInputCardProps) {
  return (
    <Card as="section" className="space-y-4" aria-labelledby="tr-input">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle id="tr-input" icon={<PenLine />}>Texto em inglês</SectionTitle>
        <span className="text-xs tabular-nums text-muted">{inputText.length} / 5000</span>
      </div>

      <TextArea
        label="Texto original em inglês"
        hideLabel
        value={inputText}
        onChange={(e) => onInputChange(e.target.value.slice(0, 5000))}
        placeholder="Insira o texto original em inglês aqui..."
        rows={7}
        disabled={isTranslating}
        lang="en"
      />

      <div className="space-y-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <FileText aria-hidden className="h-3.5 w-3.5" /> Exemplos rápidos para testar:
        </span>
        <div className="flex flex-wrap gap-2">
          {TEXT_EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onInputChange(ex.text)}
              disabled={isTranslating}
              className={cx(
                "rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand/50 hover:bg-brand/10 disabled:opacity-50",
                focusRing,
              )}
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
