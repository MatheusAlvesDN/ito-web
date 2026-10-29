// Título de seção dos cards do Tradutor (ícone + texto).
import type { ReactNode } from "react";

export default function SectionTitle({ icon, children, id }: { icon: ReactNode; children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 font-display text-base font-bold text-ink [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-wood">
      <span aria-hidden className="inline-flex">{icon}</span>
      {children}
    </h2>
  );
}
