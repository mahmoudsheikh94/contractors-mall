export const formatCurrency = (amount: number, currency: string = 'JOD') => {
  return `${amount.toFixed(2)} ${currency}`
}