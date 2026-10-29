// ConfigForm: formulário de config do modo gerado de MODE_META (líder edita; outros veem o resumo).
import type { GameMode } from '../../../lib/room';
import { SegmentedControl, Stepper, Toggle } from '../../../ui';
import { MODE_META, configValue, type ConfigField } from '../../games/modes';

export interface ConfigFormProps {
  mode: GameMode;
  config: Record<string, unknown>;
  editable: boolean;
  onChange: (config: Record<string, unknown>) => void;
}

function formatValue(field: ConfigField, v: number | string | boolean): string {
  if (field.kind === 'toggle') return v ? 'Sim' : 'Não';
  if (field.kind === 'choice') return field.options.find((o) => o.value === v)?.label ?? String(v);
  if (field.unit === 'seconds') {
    const n = Number(v);
    return n % 60 === 0 ? `${n / 60} min` : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')} min`;
  }
  return String(v);
}

/** Config completa (padrões + atual) — SET_CONFIG troca tudo. */
function fullConfig(mode: GameMode, config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of MODE_META[mode].config) out[f.key] = configValue(config, f);
  return out;
}

export function ConfigForm({ mode, config, editable, onChange }: ConfigFormProps) {
  const fields = MODE_META[mode].config;
  if (fields.length === 0) return <p className="text-sm text-muted">Este jogo não tem configurações.</p>;
  const set = (key: string, value: unknown) => onChange({ ...fullConfig(mode, config), [key]: value });

  if (!editable) {
    return (
      <dl className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <div key={f.key} className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">{f.label}</dt>
            <dd className="font-semibold">{formatValue(f, configValue(config, f))}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const v = configValue(config, f);
        if (f.kind === 'toggle') {
          return <Toggle key={f.key} label={f.label} description={f.description} checked={Boolean(v)} onChange={(c) => set(f.key, c)} />;
        }
        if (f.kind === 'choice') {
          return (
            <div key={f.key} className="space-y-1.5">
              <p className="text-sm font-semibold">{f.label}</p>
              <SegmentedControl
                aria-label={f.label}
                value={String(v)}
                onChange={(s: string) => set(f.key, typeof f.default === 'number' ? Number(s) : s)}
                options={f.options.map((o) => ({ value: String(o.value), label: o.label }))}
              />
            </div>
          );
        }
        return (
          <Stepper
            key={f.key}
            label={f.label}
            showLabel
            value={Number(v)}
            min={f.min}
            max={f.max}
            step={f.step}
            format={(n) => formatValue(f, n)}
            onChange={(n) => set(f.key, n)}
          />
        );
      })}
    </div>
  );
}
