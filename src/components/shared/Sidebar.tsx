'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bell, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: '警示管理', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? '關閉選單' : '開啟選單'}
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 flex h-full w-60 flex-col border-r border-[#1E293B] bg-[#0F172A] transition-transform duration-200',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible
          'md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-[#1E293B] px-5">
          <span className="text-lg font-bold text-[#F8FAFC]">台股助手</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                    : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]'
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
