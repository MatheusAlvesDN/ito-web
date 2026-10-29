// Layout das rotas protegidas do admin: exige token, carrega quem está logado e trata sessão expirada.
import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminLogout, getMe, hasAdminToken, onAdminUnauthorized } from '../../lib/adminApi';
import { AdminSessionContext, type AdminSession } from './session';
import { useAdminQuery } from './useAdminQuery';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = hasAdminToken();
  const me = useAdminQuery((signal) => (loggedIn ? getMe(signal) : Promise.resolve(null)), loggedIn ? 'me' : 'anon');

  // Sessão expirada/inválida em qualquer chamada → volta ao login lembrando a página.
  useEffect(
    () =>
      onAdminUnauthorized((message) => {
        toast.error(message, { id: 'admin-401' });
        navigate('/admin/login', { replace: true, state: { from: location.pathname + location.search } });
      }),
    [navigate, location.pathname, location.search],
  );

  const logout = useCallback(() => {
    void adminLogout().then(() => {
      toast.success('Você saiu da área do admin.');
      navigate('/admin/login', { replace: true });
    });
  }, [navigate]);

  const session = useMemo<AdminSession>(() => ({ admin: me.data ?? null, logout }), [me.data, logout]);

  if (!loggedIn) return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;

  return (
    <AdminSessionContext.Provider value={session}>
      <Outlet />
    </AdminSessionContext.Provider>
  );
}
