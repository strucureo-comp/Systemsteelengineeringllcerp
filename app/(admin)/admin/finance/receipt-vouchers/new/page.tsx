import { redirect } from 'next/navigation';

export default function ReceiptVoucherNewRouteFallback() {
  redirect('/admin/finance/receipt-vouchers');
}
