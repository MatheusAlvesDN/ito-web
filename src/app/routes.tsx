// Rotas do app (react-router v7, modo data). Telas novas entram aqui.
import type { ComponentType } from 'react';
import { createBrowserRouter, Outlet, type RouteObject } from 'react-router-dom';
import HomePage from '../features/home/HomePage';
import PreparePage from '../features/play/PreparePage';
import RoomPage from '../features/play/RoomPage';
import NotFoundPage from '../features/system/NotFoundPage';
import RouteErrorPage from '../features/system/RouteErrorPage';
import TranslatorPage from '../features/translator/TranslatorPage';

// Painel admin: carregado sob demanda (fora do bundle de quem só joga).
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });
const adminRoutes: RouteObject[] = [
  { path: 'login', lazy: page(() => import('../features/admin/LoginPage')) },
  {
    lazy: page(() => import('../features/admin/AdminLayout')),
    children: [
      { index: true, lazy: page(() => import('../features/admin/GamesPage')) },
      { path: 'jogos/:gameId', lazy: page(() => import('../features/admin/GameThemesPage')) },
      { path: 'temas/:themeId', lazy: page(() => import('../features/admin/ThemeItemsPage')) },
      { path: 'admins', lazy: page(() => import('../features/admin/AdminsPage')) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'jogar/:modo', element: <PreparePage /> },
      { path: 'sala/:codigo', element: <RoomPage /> },
      { path: 'tradutor', element: <TranslatorPage /> },
      { path: 'admin', children: adminRoutes },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
