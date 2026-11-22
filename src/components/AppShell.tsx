'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  BellRing,
  Receipt,
  TrendingUp,
  SlidersHorizontal,
  Settings,
  Menu,
  X,
  Wallet,
  LogOut,
} from 'lucide-react';

const PRODUCT_NAME = 'Kairos';
const PRODUCT_TAGLINE = 'Tutor Billing & Cash';

const NAV_ITEMS = [
  { label: 'Who Owes Me', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Generate Invoices', href: '/generate-invoices', icon: Sparkles },
  { label: 'Reminder Draft', href: '/reminder-draft', icon: BellRing },
  { label: 'Bills', href: '/bills', icon: Receipt },
  { label: 'Cash Forecast', href: '/cash-forecast', icon: TrendingUp },
  { label: 'What-If Scenario', href: '/what-if-scenario', icon: SlidersHorizontal },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  if (pathname === '/login') {
    return <main className="min-h-screen w-full bg-background">{children}</main>;
  }

  const brand = (
    <div className="ui-brand flex min-w-0 items-center gap-3 px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Wallet className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold leading-tight text-foreground">
          {PRODUCT_NAME}
        </span>
        <span className="block truncate text-xs font-medium text-muted-foreground">
          {PRODUCT_TAGLINE}
        </span>
      </div>
    </div>
  );

  const nav = (
    <nav
      className="ui-nav flex flex-1 flex-col gap-1 p-3"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
            className={`group flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-all ${
              active
                ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground/80 group-hover:text-foreground'
              }`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div
      data-nexen-component="nx_components_AppShell"
      className="ui-root ui-shell flex min-h-screen w-full flex-col overflow-x-hidden bg-background text-foreground sm:flex-row"
    >
      {/* Mobile Topbar */}
      <header className="ui-topbar sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-2 backdrop-blur-md sm:hidden">
        <div className="min-w-0 flex-1">{brand}</div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="app-menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-xs hover:bg-muted"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        id="app-menu"
        className={`ui-sidebar ${
          menuOpen ? 'flex' : 'hidden'
        } w-full shrink-0 flex-col border-b border-border bg-card sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-60 sm:border-b-0 sm:border-r`}
      >
        <div className="hidden border-b border-border/60 sm:flex">{brand}</div>
        {nav}

        {/* Footer status in sidebar */}
        <div className="border-t border-border/60 p-3.5 space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <div className="min-w-0 text-xs">
              <p className="font-medium text-foreground">Home Tutor Mode</p>
              <p className="text-muted-foreground truncate">Auto-chase active</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ui-content min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
