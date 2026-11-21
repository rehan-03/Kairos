import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import InvoiceForm from '@/components/InvoiceForm';

export default function NewInvoicePage() {
  return (
    <div data-nexen-component="nx_app_invoices_new_page" className="ui-page">
      <PageHeader
        title="New invoice"
        subtitle="One-off invoice for a single job or workshop"
        action={
          <Link className="ui-btn ui-btn-ghost" href="/invoices">
            Cancel
          </Link>
        }
      />

      <section className="ui-section">
        <div className="ui-card">
          <div className="ui-card-body min-w-0">
            <InvoiceForm />
          </div>
        </div>
      </section>
    </div>
  );
}