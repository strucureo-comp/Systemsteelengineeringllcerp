import { redirect } from 'next/navigation';

export default function FinanceTaxesRedirectPage() {
  redirect('/admin/settings/taxes');
}
