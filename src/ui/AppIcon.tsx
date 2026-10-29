// AppIcon: ícone lucide a partir do nome salvo no banco (ex.: "Brain"); cai em Sparkles se desconhecido.
import { createElement } from 'react';
import { getIconComponent } from '../utils/iconMap';

export function AppIcon({ name, className }: { name?: string | null; className?: string }) {
  return createElement(getIconComponent(name ?? undefined), { className, 'aria-hidden': true });
}
