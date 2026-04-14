import { redirect } from 'next/navigation';

export default function FinancePayablesRedirectPage() {
  redirect('/admin/purchases/bills');
}
