// Erro inesperado ao renderizar uma rota (errorElement do router).
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Button, EmptyState, Screen } from '../../ui';

export default function RouteErrorPage() {
  const err = useRouteError();
  const detail = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : null;
  if (err) console.error(err);
  return (
    <Screen title="Algo deu errado" back="/">
      <EmptyState
        tone="danger"
        icon={<TriangleAlert />}
        title="Algo deu errado"
        description={detail ?? 'Ocorreu um erro inesperado nesta tela.'}
        action={
          <>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
            <Button to="/">Ir para o início</Button>
          </>
        }
      />
    </Screen>
  );
}
