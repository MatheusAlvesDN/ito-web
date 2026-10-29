// BulkImportModal: colar uma lista (um item por linha) e mostrar o resultado da importação.
import { useState, type FormEvent } from 'react';
import { CheckCircle2, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import { bulkImport, type BulkImportResult, type ItemType } from '../../../lib/adminApi';
import { Badge, Button, Card, Modal, TextArea } from '../../../ui';
import { ITEM_TYPES, countWith, errorMessage, plural } from '../utils';

interface BulkImportModalProps {
  themeId: string;
  themeName: string;
  type: ItemType;
  onClose: () => void;
  /** Chamado quando algo foi criado (para recarregar a lista). */
  onImported: (result: BulkImportResult) => void;
}

export function BulkImportModal({ themeId, themeName, type, onClose, onImported }: BulkImportModalProps) {
  const info = ITEM_TYPES[type];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const lineCount = text.split('\n').filter((l) => l.trim()).length;
  const formId = 'bulk-import-form';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lineCount === 0) return;
    setBusy(true);
    try {
      const res = await bulkImport(themeId, text.split(/\r?\n/));
      setResult(res);
      if (res.created > 0) {
        onImported(res);
        toast.success(`${countWith(type, res.created, 'importad')}.`);
      } else toast.warning('Nenhum item novo foi importado.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Importar em lote"
      description={`Cole a lista para o tema “${themeName}”. Linhas vazias e repetidas são ignoradas.`}
      dismissible={!busy}
      footer={
        result ? (
          <>
            <Button variant="secondary" onClick={() => setResult(null)}>
              Importar mais
            </Button>
            <Button onClick={onClose}>Concluir</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} loading={busy} disabled={lineCount === 0}>
              {lineCount > 0 ? `Importar ${lineCount} ${lineCount === 1 ? 'linha' : 'linhas'}` : 'Importar'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <ImportResult result={result} />
      ) : (
        <form id={formId} onSubmit={submit} className="space-y-3">
          <Card tone="sunken" padding="sm" className="text-sm">
            <p className="font-semibold text-ink">{info.lineFormat}</p>
            <p className="mt-1 text-xs text-muted">Exemplo:</p>
            <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink">{info.lineExample}</pre>
          </Card>
          <TextArea
            label="Lista"
            hint={lineCount > 0 ? `${plural(lineCount, 'linha preenchida', 'linhas preenchidas')}.` : 'Um item por linha.'}
            value={text}
            rows={10}
            disabled={busy}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            className="font-mono text-sm"
            data-autofocus
          />
        </form>
      )}
    </Modal>
  );
}

function ImportResult({ result }: { result: BulkImportResult }) {
  return (
    <div role="status" className="space-y-4">
      <div className="flex items-center gap-3">
        <div aria-hidden className={result.created > 0 ? 'text-success' : 'text-warning'}>
          {result.created > 0 ? <CheckCircle2 className="h-8 w-8" /> : <FileWarning className="h-8 w-8" />}
        </div>
        <p className="font-display text-lg font-bold">
          {result.created > 0 ? countWith(result.type, result.created, 'adicionad') : 'Nada novo para adicionar'}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Criados" value={result.created} tone="success" />
        <Stat label="Repetidos" value={result.skipped_duplicate} />
        <Stat label="Vazios" value={result.skipped_blank} />
        <Stat label="Com erro" value={result.invalid.length} tone={result.invalid.length ? 'danger' : undefined} />
      </dl>
      {result.invalid.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Linhas não importadas</h3>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface-2 p-2 text-sm">
            {result.invalid.map((e) => (
              <li key={e.line} className="flex gap-2">
                <Badge tone="danger">Linha {e.line}</Badge>
                <span className="text-muted">{e.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' && value > 0 ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-display text-xl font-bold ${color}`}>{value}</dd>
    </div>
  );
}
