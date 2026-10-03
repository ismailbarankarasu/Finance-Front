import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import { AccountClass, CompanyRole, PartyType } from "../../utils/accounting";
import { EmptyState, PageError, PageLoading } from "../../components/PageState";

const initialProduct = {
  code: "",
  name: "",
  unit: "Adet",
  salesPrice: "",
  defaultTaxRateId: "",
  criticalStockQuantity: "0",
  preferredSupplierId: "",
  inventoryAccountId: "",
  costAccountId: "",
};

const initialTax = {
  name: "",
  rate: "",
};

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductsPage() {
  const { activeCompany, activeCompanyId, activePeriodId } = useAccounting();

  const [products, setProducts] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [balances, setBalances] = useState([]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [productForm, setProductForm] = useState(initialProduct);

  const [taxForm, setTaxForm] = useState(initialTax);

  const [submitError, setSubmitError] = useState("");

  const [submitStatus, setSubmitStatus] = useState("idle");

  const canManage =
    activeCompany?.role === CompanyRole.Admin ||
    activeCompany?.role === CompanyRole.Accountant;

  const inventoryAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          account.isPostingAllowed &&
          account.accountClass === AccountClass.Asset,
      ),
    [accounts],
  );

  const costAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          account.isPostingAllowed &&
          account.accountClass === AccountClass.Expense,
      ),
    [accounts],
  );

  const loadData = useCallback(async (signal) => {
    if (!activeCompanyId) return;

    setStatus("loading");
    setError("");

    try {
      const requests = [
        api.get(`/companies/${activeCompanyId}/products`, { signal }),

        api.get(`/companies/${activeCompanyId}/tax-rates`, { signal }),

        api.get(`/companies/${activeCompanyId}/accounts`, { signal }),

        api.get(`/companies/${activeCompanyId}/counterparties`, {
          params: {
            page: 1,
            pageSize: 100,
          },
          signal,
        }),
      ];

      if (activePeriodId) {
        requests.push(
          api.get(`/companies/${activeCompanyId}/inventory/balances`, {
            params: {
              periodId: activePeriodId,
            },
            signal,
          }),
        );
      }

      const results = await Promise.all(requests);

      if (signal?.aborted) return;

      setProducts(results[0].data ?? []);
      setTaxRates(results[1].data ?? []);
      setAccounts(results[2].data ?? []);

      const parties = results[3].data?.items ?? [];

      setSuppliers(
        parties.filter(
          (party) =>
            party.isActive &&
            (party.type === PartyType.Supplier ||
              party.type === PartyType.Both),
        ),
      );

      setBalances(results[4]?.data ?? []);

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ?? "Ürün ve stok bilgileri yüklenemedi.",
      );
    }
  }, [activeCompanyId, activePeriodId]);

  useEffect(() => {
    if (!activeCompanyId) return;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadData(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCompanyId, activePeriodId, loadData]);

  function updateProduct(field, value) {
    setProductForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateTax(field, value) {
    setTaxForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function getBalance(productId) {
    return (
      balances.find((item) => item.productId === productId) ?? {
        quantity: 0,
        value: 0,
      }
    );
  }

  async function createTax(event) {
    event.preventDefault();

    const name = taxForm.name.trim();
    const rate = Number(taxForm.rate);

    if (!name || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      setSubmitError("Geçerli bir KDV adı ve 0-100 arası oran girin.");
      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      await api.post(`/companies/${activeCompanyId}/tax-rates`, {
        name,
        rate,
        isActive: true,
      });

      setTaxForm(initialTax);

      await loadData();

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(
        error.response?.data?.message ?? "KDV oranı oluşturulamadı.",
      );
    }
  }

  async function createProduct(event) {
    event.preventDefault();

    if (
      !productForm.code.trim() ||
      !productForm.name.trim() ||
      !productForm.defaultTaxRateId ||
      !productForm.inventoryAccountId ||
      !productForm.costAccountId
    ) {
      setSubmitError("Ürün kodu, adı, KDV ve muhasebe hesapları zorunludur.");
      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      await api.post(`/companies/${activeCompanyId}/products`, {
        code: productForm.code.trim(),

        name: productForm.name.trim(),

        unit: productForm.unit.trim() || "Adet",

        salesPrice: Number(productForm.salesPrice),

        defaultTaxRateId: Number(productForm.defaultTaxRateId),

        criticalStockQuantity: Number(productForm.criticalStockQuantity),

        preferredSupplierId: productForm.preferredSupplierId
          ? Number(productForm.preferredSupplierId)
          : null,

        inventoryAccountId: Number(productForm.inventoryAccountId),

        costAccountId: Number(productForm.costAccountId),

        isActive: true,

        version: 1,
      });

      setProductForm(initialProduct);

      await loadData();

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(error.response?.data?.message ?? "Ürün oluşturulamadı.");
    }
  }

  if (!activeCompany) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Ürünleri görüntülemek için önce aktif şirket seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='mb-4'>
        <h1 className='h3'>Ürün ve Stok Yönetimi</h1>

        <p className='text-body-secondary mb-0'>
          {activeCompany.name} şirketinin ürünlerini, KDV oranlarını ve stok
          durumunu yönetin.
        </p>
      </header>

      {submitError && <div className='alert alert-danger'>{submitError}</div>}

      {canManage && (
        <div className='row g-4 mb-4'>
          <div className='col-lg-4'>
            <div className='card h-100'>
              <div className='card-header'>
                <h2 className='h5 mb-0'>KDV Oranları</h2>
              </div>

              <div className='card-body'>
                <form onSubmit={createTax} className='mb-4'>
                  <div className='mb-3'>
                    <label className='form-label'>KDV Adı</label>

                    <input
                      className='form-control'
                      placeholder='Örn. KDV %20'
                      value={taxForm.name}
                      onChange={(event) =>
                        updateTax("name", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className='mb-3'>
                    <label className='form-label'>Oran</label>

                    <div className='input-group'>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        step='0.01'
                        className='form-control'
                        value={taxForm.rate}
                        onChange={(event) =>
                          updateTax("rate", event.target.value)
                        }
                        required
                      />

                      <span className='input-group-text'>%</span>
                    </div>
                  </div>

                  <button
                    className='btn btn-primary w-100'
                    disabled={submitStatus === "loading"}
                  >
                    KDV Oranı Ekle
                  </button>
                </form>

                <div className='list-group'>
                  {taxRates.map((tax) => (
                    <div
                      key={tax.id}
                      className='list-group-item d-flex justify-content-between'
                    >
                      <span>{tax.name}</span>

                      <strong>%{tax.rate}</strong>
                    </div>
                  ))}

                  {taxRates.length === 0 && (
                    <div className='text-center py-3 text-body-secondary'>
                      <i className='bi bi-percent d-block fs-4 mb-2' />
                      KDV oranı bulunmuyor.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className='col-lg-8'>
            <div className='card h-100'>
              <div className='card-header'>
                <h2 className='h5 mb-0'>Yeni Ürün</h2>
              </div>

              <div className='card-body'>
                <form onSubmit={createProduct}>
                  <div className='row g-3'>
                    <div className='col-md-4'>
                      <label className='form-label'>Ürün Kodu</label>

                      <input
                        className='form-control'
                        maxLength={30}
                        placeholder='URN-001'
                        value={productForm.code}
                        onChange={(event) =>
                          updateProduct("code", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className='col-md-8'>
                      <label className='form-label'>Ürün Adı</label>

                      <input
                        className='form-control'
                        value={productForm.name}
                        onChange={(event) =>
                          updateProduct("name", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className='col-md-4'>
                      <label className='form-label'>Birim</label>

                      <input
                        className='form-control'
                        value={productForm.unit}
                        onChange={(event) =>
                          updateProduct("unit", event.target.value)
                        }
                      />
                    </div>

                    <div className='col-md-4'>
                      <label className='form-label'>Satış Fiyatı</label>

                      <input
                        type='number'
                        min='0'
                        step='0.01'
                        className='form-control'
                        value={productForm.salesPrice}
                        onChange={(event) =>
                          updateProduct("salesPrice", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className='col-md-4'>
                      <label className='form-label'>KDV</label>

                      <select
                        className='form-select'
                        value={productForm.defaultTaxRateId}
                        onChange={(event) =>
                          updateProduct("defaultTaxRateId", event.target.value)
                        }
                        required
                      >
                        <option value=''>KDV seçin</option>

                        {taxRates
                          .filter((tax) => tax.isActive)
                          .map((tax) => (
                            <option key={tax.id} value={tax.id}>
                              {tax.name} — %{tax.rate}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className='col-md-4'>
                      <label className='form-label'>Kritik Stok</label>

                      <input
                        type='number'
                        min='0'
                        step='0.0001'
                        className='form-control'
                        value={productForm.criticalStockQuantity}
                        onChange={(event) =>
                          updateProduct(
                            "criticalStockQuantity",
                            event.target.value,
                          )
                        }
                      />
                    </div>

                    <div className='col-md-8'>
                      <label className='form-label'>
                        Tercih Edilen Tedarikçi
                      </label>

                      <select
                        className='form-select'
                        value={productForm.preferredSupplierId}
                        onChange={(event) =>
                          updateProduct(
                            "preferredSupplierId",
                            event.target.value,
                          )
                        }
                      >
                        <option value=''>Tedarikçi seçilmedi</option>

                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.code} — {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className='col-md-6'>
                      <label className='form-label'>Stok Hesabı</label>

                      <select
                        className='form-select'
                        value={productForm.inventoryAccountId}
                        onChange={(event) =>
                          updateProduct(
                            "inventoryAccountId",
                            event.target.value,
                          )
                        }
                        required
                      >
                        <option value=''>Stok hesabı seçin</option>

                        {inventoryAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className='col-md-6'>
                      <label className='form-label'>Maliyet Hesabı</label>

                      <select
                        className='form-select'
                        value={productForm.costAccountId}
                        onChange={(event) =>
                          updateProduct("costAccountId", event.target.value)
                        }
                        required
                      >
                        <option value=''>Maliyet hesabı seçin</option>

                        {costAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className='col-12'>
                      <button
                        className='btn btn-primary'
                        disabled={submitStatus === "loading"}
                      >
                        Ürün Oluştur
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='card'>
        <div className='card-header d-flex justify-content-between'>
          <h2 className='h5 mb-0'>Ürünler</h2>

          <span className='text-body-secondary'>{products.length} ürün</span>
        </div>

        {status === "loading" ? (
          <PageLoading text='Ürünler yükleniyor…' />
        ) : status === "error" ? (
          <div className='card-body'>
            <PageError message={error} onRetry={() => loadData()} />
          </div>
        ) : products.length === 0 ? (
          <div className='card-body'>
            <EmptyState
              icon='bi-box-seam'
              title='Henüz ürün yok'
              text='Bu şirket için henüz ürün tanımlanmamış.'
            />
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table table-hover align-middle mb-0'>
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ürün</th>
                  <th>Birim</th>
                  <th className='text-end'>Satış Fiyatı</th>
                  <th className='text-end'>Stok</th>
                  <th className='text-end'>Stok Değeri</th>
                  <th>Kritik Stok</th>
                  <th>Durum</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const balance = getBalance(product.id);

                  const isCritical =
                    Number(balance.quantity) <=
                    Number(product.criticalStockQuantity);

                  return (
                    <tr key={product.id}>
                      <td>
                        <code>{product.code}</code>
                      </td>

                      <td className='fw-semibold'>{product.name}</td>

                      <td>{product.unit}</td>

                      <td className='text-end'>{money(product.salesPrice)}</td>

                      <td className='text-end'>
                        {Number(balance.quantity).toLocaleString("tr-TR")}
                      </td>

                      <td className='text-end'>{money(balance.value)}</td>

                      <td>
                        {isCritical ? (
                          <span className='badge text-bg-danger'>Kritik</span>
                        ) : (
                          <span className='badge text-bg-success'>Normal</span>
                        )}

                        <span className='ms-2'>
                          ≤ {product.criticalStockQuantity}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            product.isActive
                              ? "text-bg-success"
                              : "text-bg-secondary"
                          }`}
                        >
                          {product.isActive ? "Aktif" : "Pasif"}
                        </span>
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
