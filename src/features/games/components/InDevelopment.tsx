// InDevelopment: placeholder das views ainda não implementadas.
import { Construction } from 'lucide-react';
import { Card, EmptyState } from '../../../ui';

export function InDevelopment({ name, phase }: { name: string; phase: string }) {
  return (
    <Card>
      <EmptyState
        icon={<Construction />}
        title="Em desenvolvimento"
        description={`A tela de ${name} ainda está sendo feita. Fase atual no servidor: “${phase}”. O líder pode voltar ao lobby pelo menu.`}
      />
    </Card>
  );
}
