
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import CustomerForm from '@/components/CustomerForm';

export default function NewCustomerPage() {
  return (
    <div data-nexen-component="nx_app_customers_new_page" className="ui-page">
      <PageHeader
        title="New customer"
        subtitle="Add a student or client to your customer book."
        action={
          <Link className="ui-link" href="/customers">
            Back to customers
          </Link>
        }
      />
      <CustomerForm />
    </div>
  );
}