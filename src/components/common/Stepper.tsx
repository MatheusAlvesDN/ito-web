import React from 'react';
import { Minus, Plus, Heart } from 'lucide-react';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
  icon?: React.ReactNode;
}

export function Stepper({ value, min = 1, max = 5, onChange, label, icon }: StepperProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-full p-1.5 shadow-sm">
        <button
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>
        
        <div className="flex items-center justify-center min-w-[5rem] gap-1">
          {Array.from({ length: max }).map((_, i) => (
            <div key={i} className={`transition-all duration-300 ${i < value ? 'scale-100 opacity-100' : 'scale-75 opacity-30 grayscale'}`}>
              {icon ? icon : <Heart className="w-5 h-5 text-red-500 fill-red-500" />}
            </div>
          ))}
        </div>

        <button
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {label && (
        <span className="text-xs font-medium text-slate-500">{label}</span>
      )}
    </div>
  );
}
