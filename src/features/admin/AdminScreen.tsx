// AdminScreen: Screen largo do painel com trilha de navegação, link para o site, tema e sair.
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink, LogOut, Users } from 'lucide-react';
import { IconButton, Screen, ThemeToggle, cx, focusRing } from '../../ui';
import { useAdminSession } from './session';

export interface Crumb {
  label: string;
  to?: string;
}

interface AdminScreenProps {
  title: ReactNode;
  /** Trilha (sem a página atual); o primeiro item com `to` vira o "voltar". */
  crumbs?: Crumb[];
  /** Destino do voltar (padrão: último item da trilha com link). */
  back?: string;
  footer?: ReactNode;
  children: ReactNode;
}

const navLink = cx(
  'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink',
  focusRing,
);

export function AdminScreen({ title, crumbs = [], back, footer, children }: AdminScreenProps) {
  const { admin, logout } = useAdminSession();
  const backTo = back ?? [...crumbs].reverse().find((c) => c.to)?.to;

  return (
    <Screen
      width="wide"
      title={title}
      subtitle={admin ? `Área do admin · ${admin.username}` : 'Área do admin'}
      back={backTo}
      right={
        <>
          <ThemeToggle />
          <IconButton aria-label="Sair da área do admin" icon={<LogOut />} onClick={logout} />
        </>
      }
      footer={footer}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <nav aria-label="Você está em" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-0.5 text-sm">
            {crumbs.map((c, i) => (
              <Fragment key={`${c.label}-${i}`}>
                <li className="min-w-0">
                  {c.to ? (
                    <Link to={c.to} className={cx(navLink, 'max-w-[14rem] truncate')}>
                      {c.label}
                    </Link>
                  ) : (
                    <span className="px-2 text-muted">{c.label}</span>
                  )}
                </li>
                <li aria-hidden className="text-muted">
                  <ChevronRight className="h-4 w-4" />
                </li>
              </Fragment>
            ))}
            <li aria-current="page" className="min-w-0 truncate px-2 font-semibold text-ink">
              {title}
            </li>
          </ol>
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/admin/admins" className={navLink}>
            <Users aria-hidden className="h-4 w-4" />
            Admins
          </Link>
          <Link to="/" className={navLink}>
            <ExternalLink aria-hidden className="h-4 w-4" />
            Ver o site
          </Link>
        </div>
      </div>
      {children}
    </Screen>
  );
}
