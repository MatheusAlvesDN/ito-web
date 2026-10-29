// 404: rota inexistente.
import { MapPinOff } from 'lucide-react';
import { Button, EmptyState, Screen } from '../../ui';

export default function NotFoundPage() {
  return (
    <Screen title="Página não encontrada" back="/">
      <EmptyState icon={<MapPinOff />} title="Nada por aqui" description="Esse endereço não existe. Que tal voltar e escolher um jogo?" action={<Button to="/">Ir para o início</Button>} />
    </Screen>
  );
}
