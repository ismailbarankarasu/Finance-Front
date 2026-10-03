import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import {
  AccountClass,
  CompanyRole,
  accountClassLabel,
} from "../../utils/accounting";
import { EmptyState, PageError, PageLoading } from "../../components/PageState";
const initialForm = {
  code: "",
  name: "",
  accountClass: AccountClass.Asset,
  parentId: "",
  isPostingAllowed: true,
  requiredDimension: "",
};

export default function AccountsPage() {
  const { activeCompany, activeCompanyId } = useAccounting();

  const [accounts, setAccounts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [form, setForm] = useState(initialForm);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitError, setSubmitError] = useState("");

  const canManage =
    activeCompany?.role === CompanyRole.Admin ||
    activeCompany?.role === CompanyRole.Accountant;

  const loadAccounts = useCallback(async (signal) => {
    if (!activeCompanyId) return;

    setStatus("loading");
    setError("");

    try {
      const { data } = await api.get(`/companies/${activeCompanyId}/accounts`, {
        signal,
      });

      if (signal?.aborted) return;

      if (!Array.isArray(data)) {
        throw new Error("Hesap planı yanıtı geçersiz.");
      }

      setAccounts(data);
      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");
      setError(error.response?.data?.message ?? "Hesap planı yüklenemedi.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadAccounts(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCompanyId, loadAccounts]);

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function seedAccounts() {
    if (!activeCompanyId) return;

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      await api.post(`/companies/${activeCompanyId}/accounts/seed`);

      await loadAccounts();

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(
        error.response?.data?.message ?? "Standart hesap planı oluşturulamadı.",
      );
    }
  }

  async function createAccount(event) {
    event.preventDefault();

    if (!activeCompanyId) return;

    const code = form.code.trim();
    const name = form.name.trim();

    if (!code || !name) {
      setSubmitError("Hesap kodu ve hesap adı zorunludur.");
      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      await api.post(`/companies/${activeCompanyId}/accounts`, {
        code,
        name,
        accountClass: Number(form.accountClass),
        parentId: form.parentId ? Number(form.parentId) : null,
        isPostingAllowed: form.isPostingAllowed,
        isActive: true,
        requiredDimension: form.requiredDimension || null,
        version: 1,
      });

      setForm(initialForm);

      await loadAccounts();

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(error.response?.data?.message ?? "Hesap oluşturulamadı.");
    }
  }

  if (!activeCompany) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Hesap planını görüntülemek için önce aktif şirket seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='d-flex flex-wrap justify-content-between gap-3 mb-4'>
        <div>
          <h1 className='h3'>Hesap Planı</h1>

          <p className='text-body-secondary mb-0'>
            {activeCompany.name} şirketinin muhasebe hesaplarını yönetin.
          </p>
        </div>

        {canManage && (
          <button
            type='button'
            className='btn btn-outline-primary'
            onClick={seedAccounts}
            disabled={submitStatus === "loading"}
          >
            <i className='bi bi-database-add me-2' />
            Standart Hesap Planını Oluştur
          </button>
        )}
      </header>

      {submitError && <div className='alert alert-danger'>{submitError}</div>}

      <div className='row g-4'>
        <div className={canManage ? "col-xl-8" : "col-12"}>
          <div className='card'>
            <div className='card-header'>
              <h2 className='h5 mb-0'>Muhasebe Hesapları</h2>
            </div>

            {status === "loading" ? (
              <PageLoading text='Hesap planı yükleniyor…' />
            ) : status === "error" ? (
              <div className='card-body'>
                <PageError message={error} onRetry={() => loadAccounts()} />
              </div>
            ) : accounts.length === 0 ? (
              <div className='card-body'>
                <EmptyState
                  icon='bi-diagram-3'
                  title='Hesap planı bulunamadı'
                  text='Bu şirket için henüz muhasebe hesabı tanımlanmamış.'
                  action={
                    canManage ? (
                      <button
                        type='button'
                        className='btn btn-primary'
                        onClick={seedAccounts}
                      >
                        <i className='bi bi-database-add me-2' />
                        Standart Hesap Planını Oluştur
                      </button>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className='table-responsive'>
                <table className='table table-hover align-middle mb-0'>
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Hesap</th>
                      <th>Sınıf</th>
                      <th>Boyut</th>
                      <th>Kayıt</th>
                      <th>Durum</th>
                    </tr>
                  </thead>

                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <code>{account.code}</code>
                        </td>

                        <td className='fw-semibold'>{account.name}</td>

                        <td>{accountClassLabel(account.accountClass)}</td>

                        <td>
                          {account.requiredDimension === "Counterparty"
                            ? "Cari"
                            : account.requiredDimension === "Treasury"
                              ? "Kasa / Banka"
                              : "—"}
                        </td>

                        <td>{account.isPostingAllowed ? "Evet" : "Hayır"}</td>

                        <td>
                          <span
                            className={`badge ${
                              account.isActive
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {account.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {canManage && (
          <div className='col-xl-4'>
            <div className='card'>
              <div className='card-header'>
                <h2 className='h5 mb-0'>Yeni Hesap</h2>
              </div>

              <div className='card-body'>
                <form onSubmit={createAccount}>
                  <div className='mb-3'>
                    <label className='form-label'>Hesap Kodu</label>

                    <input
                      className='form-control'
                      maxLength={30}
                      required
                      value={form.code}
                      placeholder='Örn. 770.01'
                      onChange={(event) =>
                        updateForm("code", event.target.value)
                      }
                    />
                  </div>

                  <div className='mb-3'>
                    <label className='form-label'>Hesap Adı</label>

                    <input
                      className='form-control'
                      required
                      value={form.name}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                    />
                  </div>

                  <div className='mb-3'>
                    <label className='form-label'>Hesap Sınıfı</label>

                    <select
                      className='form-select'
                      value={form.accountClass}
                      onChange={(event) =>
                        updateForm("accountClass", event.target.value)
                      }
                    >
                      <option value={1}>Varlık</option>
                      <option value={2}>Yükümlülük</option>
                      <option value={3}>Özkaynak</option>
                      <option value={4}>Gelir</option>
                      <option value={5}>Gider</option>
                    </select>
                  </div>

                  <div className='mb-3'>
                    <label className='form-label'>Üst Hesap</label>

                    <select
                      className='form-select'
                      value={form.parentId}
                      onChange={(event) =>
                        updateForm("parentId", event.target.value)
                      }
                    >
                      <option value=''>Üst hesap yok</option>

                      {accounts
                        .filter((account) => !account.isPostingAllowed)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className='mb-3'>
                    <label className='form-label'>Zorunlu Boyut</label>

                    <select
                      className='form-select'
                      value={form.requiredDimension}
                      onChange={(event) =>
                        updateForm("requiredDimension", event.target.value)
                      }
                    >
                      <option value=''>Yok</option>
                      <option value='Counterparty'>Cari</option>
                      <option value='Treasury'>Kasa / Banka</option>
                    </select>
                  </div>

                  <div className='form-check mb-3'>
                    <input
                      id='postingAllowed'
                      type='checkbox'
                      className='form-check-input'
                      checked={form.isPostingAllowed}
                      onChange={(event) =>
                        updateForm("isPostingAllowed", event.target.checked)
                      }
                    />

                    <label
                      htmlFor='postingAllowed'
                      className='form-check-label'
                    >
                      Bu hesaba kayıt yapılabilir
                    </label>
                  </div>

                  <button
                    className='btn btn-primary w-100'
                    disabled={submitStatus === "loading"}
                  >
                    Hesap Oluştur
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
