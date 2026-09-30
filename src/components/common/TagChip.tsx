import React from 'react';

type TagVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'purple';

interface TagChipProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: TagVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<TagVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-orange-50 text-orange-700 border-orange-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-party-blue/10 text-party-blue border-party-blue/20',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

export function TagChip({ label, icon, variant = 'neutral', className = '', size = 'sm' }: TagChipProps) {
  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border font-semibold
      ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
      ${variantStyles[variant]}
      ${className}
    `}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="tracking-wide uppercase">{label}</span>
    </div>
  );
}
