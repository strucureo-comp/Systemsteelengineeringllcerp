export function formatCurrency(
  amount: number, 
  currencyCode: string = 'AED', 
  options: { compact?: boolean } = {}
): string {
  try {
    const code = (currencyCode || 'AED').toUpperCase();
    
    const formatterOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: code,
      minimumFractionDigits: options.compact ? 0 : 2,
      maximumFractionDigits: options.compact ? 1 : 2,
    };

    if (options.compact) {
      formatterOptions.notation = 'compact';
      formatterOptions.compactDisplay = 'short';
    }
    
    return new Intl.NumberFormat('en-AE', formatterOptions).format(amount);
  } catch (error) {
    return `${currencyCode || 'AED'} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}
