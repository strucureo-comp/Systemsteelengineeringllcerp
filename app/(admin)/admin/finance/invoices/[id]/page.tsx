import { redirect } from 'next/navigation';

export default function FinanceInvoiceDetailRedirectPage() {
  redirect('/admin/sales/invoices');
}
