import { redirect } from 'next/navigation';

export default function FinanceInvoicesRedirectPage() {
  redirect('/admin/sales/invoices');
}
