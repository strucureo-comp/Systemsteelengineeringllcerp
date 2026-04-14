import { redirect } from 'next/navigation';

export default function FinanceMultiCurrencyRedirectPage() {
  redirect('/admin/settings/currency');
}
