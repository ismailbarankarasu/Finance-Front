import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import { AccountClass, CompanyRole } from "../../utils/accounting";
import { EmptyState, PageLoading } from "../../components/PageState";

function emptyLine() {
  return {
    productId: "",
    quantity: "",
    totalCost: "",
  };
}

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InventoryPage() {
  const { activeCompany, activeCompanyId, activePeriod, activePeriodId } =
    useAccounting();

  const [products, setProducts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [lines, setLines] = useState([emptyLine()]);

  const [equityAccountId, setEquityAccountId] = useState("");

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");

  const canManage =
    activeCompany?.role === CompanyRole.Admin ||
    activeCompany?.role === CompanyRole.Accountant;

  const equityAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          account.isPostingAllowed &&
          account.accountClass === AccountClass.Equity &&
          !account.requiredDimension,
      ),
    [accounts],
  );

  const loadData = useCallback(async (signal) => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const [productsResponse, balancesResponse, accountsResponse] =
        await Promise.all([
          api.get(`/companies/${activeCompanyId}/products`, { signal }),

          api.get(`/companies/${activeCompanyId}/inventory/balances`, {
            params: {
              periodId: activePeriodId,
            },
            signal,
          }),

          api.get(`/companies/${activeCompanyId}/accounts`, { signal }),
        ]);

      if (signal?.aborted) return;

      setProducts(productsResponse.data ?? []);

      setBalances(balancesResponse.data ?? []);

      setAccounts(accountsResponse.data ?? []);

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(error.response?.data?.message ?? "Stok bilgileri yüklenemedi.");
    }
  }, [activeCompanyId, activePeriodId]);

  useEffect(() => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadData(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCompanyId, activePeriodId, loadData]);

  function updateLine(index, field, value) {
    setLines((previous) =>
      previous.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function addLine() {
    setLines((previous) => [...previous, emptyLine()]);
  }

  function removeLine(index) {
    setLines((previous) =>
      previous.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  async function createOpening(event) {
    event.preventDefault();

    if (!activePeriodId || !equityAccountId) {
      setError("Dönem ve karşı hesap seçilmelidir.");
      return;
    }

    const validLines = lines.filter(
      (line) =>
        line.productId &&
        Number(line.quantity) > 0 &&
        Number(line.totalCost) > 0,
    );

    if (validLines.length !== lines.length || validLines.length === 0) {
      setError("Tüm stok açılış satırlarını eksiksiz doldurun.");
      return;
    }

    const uniqueProducts = new Set(validLines.map((line) => line.productId));

    if (uniqueProducts.size !== validLines.length) {
      setError("Aynı ürün stok açılışında yalnızca bir kez kullanılabilir.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      await api.post(`/companies/${activeCompanyId}/inventory/opening`, {
        fiscalPeriodId: activePeriodId,

        date: activePeriod.startDate,

        equityAccountId: Number(equityAccountId),

        lines: validLines.map((line) => ({
          productId: Number(line.productId),

          quantity: Number(line.quantity),

          totalCost: Number(line.totalCost),
        })),

        idempotencyKey: `inventory-opening-${activePeriodId}-${crypto.randomUUID()}`,
      });

      setLines([emptyLine()]);

      await loadData();

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(error.response?.data?.message ?? "Stok açılışı oluşturulamadı.");
    }
  }

  if (!activeCompany || !activePeriod) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Stok işlemleri için aktif şirket ve mali dönem seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='mb-4'>
        <h1 className='h3'>Stok Yönetimi</h1>

        <p className='text-body-secondary mb-0'>
          {activeCompany.name} · {activePeriod.name}
        </p>
      </header>

      {error && <div className='alert alert-danger'>{error}</div>}

      {canManage && activePeriod.status === 1 && (
        <form className='card mb-4' onSubmit={createOpening}>
          <div className='card-header'>
            <h2 className='h5 mb-0'>İlk Stok Açılışı</h2>
          </div>

          <div className='card-body'>
            <div className='alert alert-info'>
              Stok açılışı yalnızca mali dönemin başlangıç tarihi olan{" "}
              <strong>{activePeriod.startDate}</strong> tarihinde oluşturulur.
            </div>

            <div className='mb-4'>
              <label className='form-label'>Açılış Karşı Hesabı</label>

              <select
                className='form-select'
                value={equityAccountId}
                onChange={(event) => setEquityAccountId(event.target.value)}
                required
              >
                <option value=''>Özkaynak hesabı seçin</option>

                {equityAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='table-responsive'>
              <table className='table align-middle'>
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Miktar</th>
                    <th>Toplam Maliyet</th>
                    <th>Birim Maliyet</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {lines.map((line, index) => {
                    const unitCost =
                      Number(line.quantity) > 0
                        ? Number(line.totalCost) / Number(line.quantity)
                        : 0;

                    return (
                      <tr key={index}>
                        <td>
                          <select
                            className='form-select'
                            value={line.productId}
                            onChange={(event) =>
                              updateLine(index, "productId", event.target.value)
                            }
                            required
                          >
                            <option value=''>Ürün seçin</option>

                            {products
                              .filter((product) => product.isActive)
                              .map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.code} — {product.name}
                                </option>
                              ))}
                          </select>
                        </td>

                        <td>
                          <input
                            type='number'
                            min='0.0001'
                            step='0.0001'
                            className='form-control'
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(index, "quantity", event.target.value)
                            }
                            required
                          />
                        </td>

                        <td>
                          <input
                            type='number'
                            min='0.01'
                            step='0.01'
                            className='form-control'
                            value={line.totalCost}
                            onChange={(event) =>
                              updateLine(index, "totalCost", event.target.value)
                            }
                            required
                          />
                        </td>

                        <td>{money(unitCost)}</td>

                        <td>
                          <button
                            type='button'
                            className='btn btn-outline-danger btn-sm'
                            disabled={lines.length === 1}
                            onClick={() => removeLine(index)}
                          >
                            <i className='bi bi-trash' />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type='button'
              className='btn btn-outline-primary btn-sm'
              onClick={addLine}
            >
              + Satır Ekle
            </button>
          </div>

          <div className='card-footer text-end'>
            <button
              className='btn btn-primary'
              type='submit'
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <span
                    className='spinner-border spinner-border-sm me-2'
                    aria-hidden='true'
                  />
                  Oluşturuluyor…
                </>
              ) : (
                <>
                  <i className='bi bi-box-arrow-in-down me-2' />
                  Stok Açılışını Oluştur
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className='card'>
        <div className='card-header'>
          <h2 className='h5 mb-0'>Güncel Stok Bakiyeleri</h2>
        </div>

        {status === "loading" ? (
          <PageLoading text='Stok bakiyeleri yükleniyor…' />
        ) : balances.length === 0 ? (
          <div className='card-body'>
            <EmptyState
              icon='bi-boxes'
              title='Stok hareketi bulunmuyor'
              text='Bu mali dönemde henüz stok hareketi oluşmamış.'
            />
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle mb-0'>
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th className='text-end'>Miktar</th>
                  <th className='text-end'>Değer</th>
                </tr>
              </thead>

              <tbody>
                {balances.map((balance) => {
                  const product = products.find(
                    (item) => item.id === balance.productId,
                  );

                  return (
                    <tr key={balance.productId}>
                      <td>
                        {product
                          ? `${product.code} — ${product.name}`
                          : `#${balance.productId}`}
                      </td>

                      <td className='text-end'>
                        {Number(balance.quantity).toLocaleString("tr-TR")}
                      </td>

                      <td className='text-end fw-semibold'>
                        {money(balance.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
