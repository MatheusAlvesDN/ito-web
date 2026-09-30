interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string | number>({ 
  options, 
  value, 
  onChange,
  className = ''
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex items-center bg-slate-100/80 p-1.5 rounded-[1.25rem] border border-slate-200/50 ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className={`
              flex-1 py-2 px-3 rounded-[1rem] text-sm font-semibold transition-all duration-300
              ${isSelected 
                ? 'bg-white text-slate-800 shadow-sm scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-100'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
