// Campos de um item de conteúdo conforme o tipo (pergunta, cenário do impostor ou personalidade).
import type { ItemType } from '../../../lib/adminApi';
import { Input } from '../../../ui';
import type { ItemDraft } from './itemDraft';

const PRIMARY_LABEL: Record<ItemType, string> = {
  questions: 'Pergunta',
  scenarios: 'Pergunta honesta',
  personalities: 'Nome',
};
const PRIMARY_MAX: Record<ItemType, number> = { questions: 500, scenarios: 255, personalities: 255 };

interface ItemFieldInputsProps {
  type: ItemType;
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  disabled?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  /** Esconde os rótulos (edição inline); continuam para leitores de tela. */
  compact?: boolean;
}

export function ItemFieldInputs({ type, draft, onChange, disabled, error, autoFocus, compact }: ItemFieldInputsProps) {
  const scenario = type === 'scenarios';
  return (
    <div className={scenario ? 'grid gap-3 md:grid-cols-2' : undefined}>
      <Input
        label={PRIMARY_LABEL[type]}
        hideLabel={compact}
        value={draft.primary}
        maxLength={PRIMARY_MAX[type]}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange({ ...draft, primary: e.target.value })}
        error={!scenario ? (error ?? undefined) : undefined}
        placeholder={compact ? PRIMARY_LABEL[type] : undefined}
      />
      {scenario && (
        <Input
          label="Variações do impostor"
          hideLabel={compact}
          hint={compact ? undefined : 'Separe com ponto e vírgula (;).'}
          value={draft.variations}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, variations: e.target.value })}
          error={error ?? undefined}
          placeholder={compact ? 'variação1; variação2' : 'Ex.: Qual comida você odeia?; Qual comida você nunca provou?'}
        />
      )}
    </div>
  );
}
