import { redirect } from 'next/navigation';

export default function FinanceQuotationDetailRedirectPage() {
  redirect('/admin/sales/quotations');
}
