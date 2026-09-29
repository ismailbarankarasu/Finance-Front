import { formatAmount } from "../../utils/finance";

export function ReportTable({ section }) {
  return (
    <div
      className='table-responsive'
      role='region'
      aria-label={`${section.title} tablosu`}
      tabIndex={0}
    >
      <table className='table table-sm align-middle report-table'>
        <caption>
          {section.title} · {section.scope}
        </caption>
        <thead>
          <tr>
            {section.headers.map((header) => (
              <th key={header} scope='col'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.length === 0 ? (
            <tr>
              <td
                colSpan={section.headers.length}
                className='text-body-secondary py-3'
              >
                Bu kapsamda kayıt bulunamadı.
              </td>
            </tr>
          ) : (
            section.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, index) => (
                  <td
                    key={index}
                    className={
                      typeof value === "number" ? "text-nowrap" : "text-break"
                    }
                  >
                    {section.moneyColumns.includes(index)
                      ? formatAmount(value)
                      : value}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
