'use client';

import { InstitutionalSection } from './InstitutionalSection';
import { MarginSection } from './MarginSection';

interface ChipsTabProps {
  stockId: string;
}

export function ChipsTab({ stockId }: ChipsTabProps) {
  return (
    <div className="space-y-6">
      <InstitutionalSection stockId={stockId} />
      <MarginSection stockId={stockId} />
    </div>
  );
}
