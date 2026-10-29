// Contexto da sessão do admin (quem está logado + sair), fornecido pelo AdminLayout.
import { createContext, useContext } from 'react';
import type { AdminUser } from '../../lib/adminApi';

export interface AdminSession {
  admin: AdminUser | null;
  logout: () => void;
}

export const AdminSessionContext = createContext<AdminSession>({ admin: null, logout: () => {} });

export function useAdminSession(): AdminSession {
  return useContext(AdminSessionContext);
}
