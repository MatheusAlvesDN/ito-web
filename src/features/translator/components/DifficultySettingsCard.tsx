import { SlidersHorizontal } from "lucide-react";
import type { DifficultySettings } from "../data";
import { Card, Toggle } from "../../../ui";
import SectionTitle from "./SectionTitle";

interface DifficultyOption {
  key: keyof DifficultySettings;
  title: string;
  description: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    key: 'obfuscateNames',
    title: 'Ofuscar nomes próprios',
    description: 'Substitui automaticamente nomes específicos (ex: Rocky, Joseilson, Sávio) e palavras capitalizadas no meio de frases por termos genéricos para apagar pistas óbvias.',
  },
  {
    key: 'doubleBounce',
    title: 'Modo ricochete (double-bounce)',
    description: 'Traduz de ida e volta por idiomas distantes (como Chinês Simplificado e Árabe) a cada etapa intermediária, alterando drasticamente a estrutura sintática.',
  },
  {
    key: 'shiftPronouns',
    title: 'Alterar pronomes (ponto de vista)',
    description: 'Muda as pessoas gramaticais (ex: de "Eu" para "Eles") em inglês para mascarar a assinatura pessoal de fala do autor da frase.',
  },
  {
    key: 'censorMatches',
    title: 'Modo censura (X, Y, Z)',
    description: 'Substitui palavras da tradução final que permaneceram idênticas ao inglês original por símbolos de censura (ex: [X], [Y]) para apagar pistas óbvias.',
  },
];

interface DifficultySettingsCardProps {
  settings: DifficultySettings;
  isTranslating: boolean;
  onToggle: (key: keyof DifficultySettings, checked: boolean) => void;
}

// Filtros do "Modo caos" (interruptores).
export default function DifficultySettingsCard({ settings, isTranslating, onToggle }: DifficultySettingsCardProps) {
  return (
    <Card as="section" className="space-y-4" aria-labelledby="tr-chaos">
      <div className="space-y-1">
        <SectionTitle id="tr-chaos" icon={<SlidersHorizontal />}>Modo caos e dificuldade</SectionTitle>
        <p className="text-xs leading-relaxed text-muted">
          Ative estes filtros para dificultar que os jogadores identifiquem a origem do texto ou os personagens originais.
        </p>
      </div>
      <div className="divide-y divide-line">
        {DIFFICULTY_OPTIONS.map((option) => (
          <Toggle
            key={option.key}
            checked={settings[option.key]}
            onChange={(checked) => onToggle(option.key, checked)}
            disabled={isTranslating}
            label={option.title}
            description={option.description}
            className="py-3 first:pt-0 last:pb-0"
          />
        ))}
      </div>
    </Card>
  );
}
