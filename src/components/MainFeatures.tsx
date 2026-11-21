import Link from 'next/link';
import {
  FileText,
  Sparkles,
  PlusCircle,
  CreditCard,
  Users,
  Receipt,
  TrendingUp,
  SlidersHorizontal,
  Settings,
  ArrowRight,
} from 'lucide-react';

type FeatureLink = {
  href: string;
  title: string;
  description: string;
  icon: typeof FileText;
  highlight?: boolean;
};

const FEATURE_LINKS: FeatureLink[] = [
  {
    href: '/invoices',
    title: 'View all invoices',
    description: 'Track open, paid, and overdue tutor bills',
    icon: FileText,
  },
  {
    href: '/generate-invoices',
    title: "Generate this month's invoices",
    description: 'Batch create monthly bills for recurring students',
    icon: Sparkles,
    highlight: true,
  },
  {
    href: '/invoices/new',
    title: 'New one-off invoice',
    description: 'Single session or ad-hoc class invoice',
    icon: PlusCircle,
  },
  {
    href: '/payments/new',
    title: 'Record payment',
    description: 'Log UPI, cash, or bank transfers received',
    icon: CreditCard,
  },
  {
    href: '/customers',
    title: 'Students & Customers',
    description: 'Manage rates, billing dates, and contacts',
    icon: Users,
  },
  {
    href: '/bills',
    title: 'Bills & Outflows',
    description: 'Rent, software, travel, and recurring expenses',
    icon: Receipt,
  },
  {
    href: '/cash-forecast',
    title: 'Cash Forecast',
    description: 'Predict bank balance over 30, 60, or 90 days',
    icon: TrendingUp,
  },
  {
    href: '/what-if-scenario',
    title: 'What-If Scenarios',
    description: 'Simulate late payments or fee adjustments',
    icon: SlidersHorizontal,
  },
  {
    href: '/settings',
    title: 'Settings',
    description: 'UPI VPA, opening cash, and buffer limits',
    icon: Settings,
  },
];

export default function MainFeatures() {
  return (
    <section data-nexen-component="nx_components_MainFeatures" className="mt-8 min-w-0">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-base font-semibold text-foreground">Quick actions & tools</h2>
        <span className="text-xs text-muted-foreground">Everything you need to manage cash</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-start gap-3 rounded-[var(--radius)] border border-border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                link.highlight
                  ? 'bg-teal-50/50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800'
                  : 'bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  link.highlight
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary'
                } transition-colors`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {link.title}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {link.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
