import { redirect } from 'next/navigation';

export default function PaymentVoucherNewRouteFallback() {
  redirect('/admin/finance/payment-vouchers');
}
