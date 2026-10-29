// /admin/admins — contas do painel: criar, ativar/desativar e trocar senha.
import { useState, type FormEvent } from 'react';
import { KeyRound, RefreshCw, ServerCrash, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createAdmin, listAdmins, updateAdmin, type AdminUserDetail } from '../../lib/adminApi';
import { Badge, Button, Card, EmptyState, IconButton, Input, Modal, PlayerAvatar, Toggle } from '../../ui';
import { AdminScreen } from './AdminScreen';
import { ListSkeleton } from './components/ListSkeleton';
import { useAdminSession } from './session';
import { usePending } from './usePending';
import { useAdminQuery } from './useAdminQuery';
import { errorMessage, plural } from './utils';

const MIN_PASSWORD = 8;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

export default function AdminsPage() {
  const { admin: me } = useAdminSession();
  const admins = useAdminQuery(listAdmins, 'admins');
  const pending = usePending<number>();
  const [creating, setCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<AdminUserDetail | null>(null);

  const activeCount = admins.data?.filter((a) => a.is_active).length ?? 0;
  const patch = (id: number, p: Partial<AdminUserDetail>) => admins.setData((list) => list.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const toggle = async (a: AdminUserDetail, next: boolean) => {
    pending.start(a.id);
    patch(a.id, { is_active: next });
    try {
      patch(a.id, await updateAdmin(a.id, { is_active: next }));
      toast.success(next ? `${a.username} foi reativado.` : `${a.username} foi desativado e desconectado.`);
    } catch (err) {
      patch(a.id, { is_active: !next });
      toast.error(errorMessage(err));
    } finally {
      pending.done(a.id);
    }
  };

  return (
    <AdminScreen title="Admins" crumbs={[{ label: 'Jogos', to: '/admin' }]}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {admins.data ? `${plural(admins.data.length, 'conta', 'contas')} · ${plural(activeCount, 'ativa', 'ativas')}` : ' '}
        </p>
        <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          Novo admin
        </Button>
      </div>

      {!admins.data && admins.loading ? (
        <ListSkeleton rows={3} label="Carregando admins…" />
      ) : !admins.data ? (
        <EmptyState
          tone="danger"
          icon={<ServerCrash />}
          title="Não deu para carregar os admins"
          description={admins.error ?? undefined}
          action={<Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={admins.reload}>Tentar de novo</Button>}
          className="rounded-2xl border border-line bg-surface"
        />
      ) : admins.data.length === 0 ? (
        <EmptyState icon={<Users />} title="Nenhum admin" className="rounded-2xl border border-line bg-surface" />
      ) : (
        <ul className="space-y-3">
          {admins.data.map((a) => {
            const isMe = me?.id === a.id;
            const lastActive = a.is_active && activeCount <= 1;
            const lockReason = isMe ? 'Você não pode desativar a própria conta.' : lastActive ? 'É preciso manter pelo menos um admin ativo.' : null;
            return (
              <Card as="li" key={a.id} padding="sm" className={`sm:p-4 ${a.is_active ? '' : 'bg-surface-2'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PlayerAvatar name={a.username} size="md" decorative />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="truncate font-display font-bold">{a.username}</h2>
                        {isMe && <Badge tone="brand">Você</Badge>}
                        {!a.is_active && <Badge tone="warning">Desativado</Badge>}
                      </div>
                      <p className="text-xs text-muted">Criado em {formatDate(a.created_at)}</p>
                      {lockReason && a.is_active && <p className="mt-0.5 text-xs text-muted">{lockReason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3 sm:justify-end sm:border-0 sm:pt-0">
                    <div className="flex items-center gap-2">
                      <Toggle
                        aria-label={`Conta ${a.username} ativa`}
                        checked={a.is_active}
                        disabled={pending.isPending(a.id) || (a.is_active && lockReason != null)}
                        onChange={(v) => void toggle(a, v)}
                      />
                      <span aria-hidden className="w-16 text-xs font-medium text-muted">{a.is_active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <IconButton aria-label={`Trocar a senha de ${a.username}`} icon={<KeyRound />} variant="soft" onClick={() => setPasswordFor(a)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      {creating && (
        <CreateAdminModal
          onClose={() => setCreating(false)}
          onCreated={(a) => {
            admins.setData((list) => [...list, a]);
            setCreating(false);
          }}
        />
      )}
      {passwordFor && <PasswordModal admin={passwordFor} isMe={me?.id === passwordFor.id} onClose={() => setPasswordFor(null)} />}
    </AdminScreen>
  );
}

function CreateAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: AdminUserDetail) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    const next: typeof errors = {};
    if (!USERNAME_RE.test(u)) next.username = 'Use de 3 a 50 caracteres: letras, números, ponto, hífen ou _.';
    if (password.length < MIN_PASSWORD) next.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
    else if (password !== confirm) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const created = await createAdmin(u, password);
      toast.success(`Admin ${created.username} criado.`);
      onCreated(created);
    } catch (err) {
      const msg = errorMessage(err);
      if (/usuário/i.test(msg)) setErrors({ username: msg });
      else toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo admin"
      description="A pessoa entra com este usuário e senha. Passe a senha por um canal seguro."
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" form="create-admin-form" loading={busy}>Criar admin</Button>
        </>
      }
    >
      <form id="create-admin-form" className="space-y-4" onSubmit={submit} noValidate>
        <Input
          label="Usuário"
          hint="Letras, números, ponto, hífen ou _. Fica em minúsculas."
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={50}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          disabled={busy}
          data-autofocus
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint={`Pelo menos ${MIN_PASSWORD} caracteres.`}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={busy}
        />
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={busy}
        />
      </form>
    </Modal>
  );
}

function PasswordModal({ admin, isMe, onClose }: { admin: AdminUserDetail; isMe: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < MIN_PASSWORD) next.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
    else if (password !== confirm) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await updateAdmin(admin.id, { password });
      toast.success(isMe ? 'Sua senha foi trocada. Outras sessões foram encerradas.' : `Senha de ${admin.username} trocada. As sessões dessa conta foram encerradas.`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isMe ? 'Trocar minha senha' : `Trocar a senha de ${admin.username}`}
      description={isMe ? 'Você continua conectado aqui; outras sessões são encerradas.' : 'As sessões abertas dessa conta serão encerradas.'}
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" form="password-form" loading={busy}>Trocar senha</Button>
        </>
      }
    >
      <form id="password-form" className="space-y-4" onSubmit={submit} noValidate>
        {/* Ajuda gerenciadores de senha a associar a conta. */}
        <input type="text" name="username" autoComplete="username" value={admin.username} readOnly hidden />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint={`Pelo menos ${MIN_PASSWORD} caracteres.`}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={busy}
          data-autofocus
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={busy}
        />
      </form>
    </Modal>
  );
}
