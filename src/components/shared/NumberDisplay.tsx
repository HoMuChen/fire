'use client';

import { cn } from '@/lib/utils';

interface NumberDisplayProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function NumberDisplay({ value, suffix, prefix, className }: NumberDisplayProps) {
  const colorClass =
    value > 0
      ? 'text-[#EF4444]' // red for positive (up)
      : value < 0
        ? 'text-[#22C55E]' // green for negative (down)
        : 'text-[#9CA3AF]'; // gray for zero

  const sign = value > 0 ? '+' : '';

  const formatted = typeof value === 'number' && !isNaN(value)
    ? value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  return (
    <span className={cn(colorClass, 'font-medium tabular-nums', className)}>
      {prefix}
      {sign}
      {formatted}
      {suffix}
    </span>
  );
}
