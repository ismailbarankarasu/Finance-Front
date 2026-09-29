import { formatAmount } from "../utils/finance";

export function SummaryCards({ summary }) {
  const cards = [
    {
      label: "Toplam gelir",
      value: formatAmount(summary.totalIncome),
      color: "text-success",
      icon: "bi-arrow-down-left",
    },
    {
      label: "Toplam gider",
      value: formatAmount(summary.totalExpense),
      color: "text-danger",
      icon: "bi-arrow-up-right",
    },
    {
      label: "Bakiye",
      value: formatAmount(summary.balance),
      color: summary.balance < 0 ? "text-danger" : "text-primary",
      icon: "bi-wallet2",
    },
    {
      label: "İşlem sayısı",
      value: summary.transactionCount,
      color: "text-secondary",
      icon: "bi-receipt",
    },
  ];
  return (
    <div className='row g-3 mb-4'>
      {cards.map((card) => (
        <div className='col-6 col-lg-3' key={card.label}>
          <div className='card h-100 border-light-subtle shadow-sm'>
            <div className='card-body'>
              <div className='text-body-secondary small mb-2'>
                <i className={`bi ${card.icon} me-2`} aria-hidden='true' />
                {card.label}
              </div>
              <div className={`fs-4 fw-semibold text-break ${card.color}`}>
                {card.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
