// /admin/login — entrar com usuário e senha (contas criadas no banco por outro admin ou pelo script).
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { adminLogin, hasAdminToken } from '../../lib/adminApi';
import { Button, Card, Input, Screen, ThemeToggle } from '../../ui';
import { errorMessage } from './utils';

function safeNext(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/admin') && !from.startsWith('/admin/login') ? from : '/admin';
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const next = safeNext((location.state as { from?: unknown } | null)?.from);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasAdminToken() && !busy) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Preencha usuário e senha.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { admin } = await adminLogin(username.trim(), password);
      toast.success(`Bem-vindo, ${admin.username}!`);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Screen title="Área do admin" subtitle="Entrar" back="/" backLabel="Voltar ao site" right={<ThemeToggle />}>
      <div className="mx-auto max-w-sm pt-4 sm:pt-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div aria-hidden className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Entrar no painel</h2>
          <p className="mt-1 text-sm text-muted">Edite jogos, temas e perguntas.</p>
        </div>
        <Card as="section" aria-label="Login">
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Usuário"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              autoFocus
            />
            <Input
              label="Senha"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              error={error ?? undefined}
            />
            <Button type="submit" fullWidth size="lg" loading={busy} leftIcon={<LogIn className="h-5 w-5" />}>
              Entrar
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          Sem conta? Peça a outro admin ou rode <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">./run.sh admin &lt;usuário&gt;</code> no servidor.
        </p>
      </div>
    </Screen>
  );
}
