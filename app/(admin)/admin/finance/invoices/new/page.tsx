import { redirect } from 'next/navigation';

export default function FinanceInvoiceNewRedirectPage() {
  redirect('/admin/sales/invoices');
}
