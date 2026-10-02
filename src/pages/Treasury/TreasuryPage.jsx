import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";

import {
  CompanyRole,
  TreasuryType,
  treasuryTypeLabel,
} from "../../utils/accounting";

const initialForm = {
  name: "",
  type: TreasuryType.Cash,
  ledgerAccountId: "",
  bankName: "",
  iban: "",
};

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TreasuryPage() {
  const {
    activeCompany,
    activeCompanyId,
    activePeriod,
    activePeriodId,
  } = useAccounting();

  const [accounts, setAccounts] = useState([]);
  const [treasuries, setTreasuries] = useState([]);

  const [selectedTreasury, setSelectedTreasury] =
    useState(null);

  const [statement, setStatement] = useState(null);
  const [reconciliation, setReconciliation] =
    useState(null);

  const [form, setForm] = useState(initialForm);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const role = activeCompany?.role;

  const canManage =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant;

  const suitableAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (
        !account.isActive ||
        !account.isPostingAllowed ||
        account.requiredDimension !== "Treasury"
      ) {
        return false;
      }

      if (Number(form.type) === TreasuryType.Cash) {
        return account.code.startsWith("100.");
      }

      return account.code.startsWith("102.");
    });
  }, [accounts, form.type]);

  async function loadData(signal) {
    if (!activeCompanyId) return;

    setStatus("loading");
    setError("");

    try {
      const [accountResponse, treasuryResponse] =
        await Promise.all([
          api.get(
            `/companies/${activeCompanyId}/accounts`,
            { signal },
          ),

          api.get(
            `/companies/${activeCompanyId}/treasury-accounts`,
            { signal },
          ),
        ]);

      setAccounts(accountResponse.data ?? []);
      setTreasuries(treasuryResponse.data ?? []);

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ??
          "Kasa/banka bilgileri yüklenemedi.",
      );
    }
  }

  useEffect(() => {
    if (!activeCompanyId) return;

    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [activeCompanyId]);

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function createTreasury(event) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.ledgerAccountId
    ) {
      setError(
        "Kasa/banka adı ve muhasebe hesabı zorunludur.",
      );

      return;
    }

    setStatus("loading");
    setError("");

    try {
      await api.post(
        `/companies/${activeCompanyId}/treasury-accounts`,
        {
          name: form.name.trim(),

          type: Number(form.type),

          ledgerAccountId: Number(
            form.ledgerAccountId,
          ),

          bankName:
            Number(form.type) === TreasuryType.Bank
              ? form.bankName.trim() || null
              : null,

          iban:
            Number(form.type) === TreasuryType.Bank
              ? form.iban.trim() || null
              : null,

          isActive: true,

          version: 1,
        },
      );

      setForm(initialForm);

      await loadData();

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(
        error.response?.data?.message ??
          "Kasa/banka hesabı oluşturulamadı.",
      );
    }
  }

  async function loadStatement(treasury) {
    if (!activePeriodId) return;

    setSelectedTreasury(treasury);
    setStatement(null);
    setReconciliation(null);
    setError("");

    try {
      const [statementResponse, reconciliationResponse] =
        await Promise.all([
          api.get(
            `/companies/${activeCompanyId}/treasury-accounts/${treasury.id}/statement`,
            {
              params: {
                periodId: activePeriodId,
              },
            },
          ),

          api.get(
            `/companies/${activeCompanyId}/treasury-accounts/${treasury.id}/reconciliation`,
            {
              params: {
                periodId: activePeriodId,
              },
            },
          ),
        ]);

      setStatement(statementResponse.data);

      setReconciliation(
        reconciliationResponse.data,
      );
    } catch (error) {
      setError(
        error.response?.data?.message ??
          "Kasa/banka ekstresi alınamadı.",
      );
    }
  }

  if (!activeCompany) {
    return (
      <section className="container py-4">
        <div className="alert alert-warning">
          Kasa/banka hesapları için aktif
          şirket seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className="container-fluid px-lg-4 py-4">
      <header className="mb-4">
        <h1 className="h3">
          Kasa ve Banka Yönetimi
        </h1>

        <p className="text-body-secondary mb-0">
          {activeCompany.name}
        </p>
      </header>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className={canManage ? "col-xl-8" : "col-12"}>
          <div className="card">
            <div className="card-header">
              <h2 className="h5 mb-0">
                Kasa / Banka Hesapları
              </h2>
            </div>

            {status === "loading" ? (
              <div className="card-body">
                Yükleniyor…
              </div>
            ) : treasuries.length === 0 ? (
              <div className="card-body">
                Kasa veya banka hesabı bulunmuyor.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Hesap</th>
                      <th>Tür</th>
                      <th>Banka</th>
                      <th>IBAN</th>
                      <th>Durum</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {treasuries.map((treasury) => (
                      <tr key={treasury.id}>
                        <td className="fw-semibold">
                          {treasury.name}
                        </td>

                        <td>
                          {treasuryTypeLabel(
                            treasury.type,
                          )}
                        </td>

                        <td>
                          {treasury.bankName || "—"}
                        </td>

                        <td>
                          {treasury.iban || "—"}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              treasury.isActive
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {treasury.isActive
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </td>

                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            disabled={!activePeriodId}
                            onClick={() =>
                              loadStatement(treasury)
                            }
                          >
                            Ekstre
                          </button>
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
          <div className="col-xl-4">
            <div className="card">
              <div className="card-header">
                <h2 className="h5 mb-0">
                  Yeni Kasa / Banka
                </h2>
              </div>

              <div className="card-body">
                <form onSubmit={createTreasury}>
                  <div className="mb-3">
                    <label className="form-label">
                      Hesap Adı
                    </label>

                    <input
                      className="form-control"
                      placeholder="Örn. Ana Kasa"
                      value={form.name}
                      onChange={(event) =>
                        updateForm(
                          "name",
                          event.target.value,
                        )
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Tür
                    </label>

                    <select
                      className="form-select"
                      value={form.type}
                      onChange={(event) => {
                        updateForm(
                          "type",
                          Number(event.target.value),
                        );

                        updateForm(
                          "ledgerAccountId",
                          "",
                        );
                      }}
                    >
                      <option value={TreasuryType.Cash}>
                        Kasa
                      </option>

                      <option value={TreasuryType.Bank}>
                        Banka
                      </option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Muhasebe Hesabı
                    </label>

                    <select
                      className="form-select"
                      value={form.ledgerAccountId}
                      onChange={(event) =>
                        updateForm(
                          "ledgerAccountId",
                          event.target.value,
                        )
                      }
                      required
                    >
                      <option value="">
                        Hesap seçin
                      </option>

                      {suitableAccounts.map(
                        (account) => (
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.code} —{" "}
                            {account.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  {Number(form.type) ===
                    TreasuryType.Bank && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">
                          Banka Adı
                        </label>

                        <input
                          className="form-control"
                          value={form.bankName}
                          onChange={(event) =>
                            updateForm(
                              "bankName",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          IBAN
                        </label>

                        <input
                          className="form-control"
                          value={form.iban}
                          onChange={(event) =>
                            updateForm(
                              "iban",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </>
                  )}

                  <button className="btn btn-primary w-100">
                    Hesap Oluştur
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTreasury &&
        statement && (
          <div className="card mt-4">
            <div className="card-header d-flex justify-content-between">
              <div>
                <h2 className="h5 mb-1">
                  {selectedTreasury.name}
                </h2>

                <span className="text-body-secondary">
                  {activePeriod?.name} Ekstresi
                </span>
              </div>

              <div className="text-end">
                <small className="text-body-secondary">
                  Bakiye
                </small>

                <div className="fs-5 fw-semibold">
                  {money(
                    statement.closingBalance,
                  )}
                </div>
              </div>
            </div>

            {reconciliation && (
              <div className="card-body border-bottom">
                <div className="row g-3">
                  <div className="col-md-3">
                    <small className="text-body-secondary">
                      Defter Bakiyesi
                    </small>

                    <div className="fw-semibold">
                      {money(
                        reconciliation.ledgerBalance,
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <small className="text-body-secondary">
                      Alt Hesap Bakiyesi
                    </small>

                    <div className="fw-semibold">
                      {money(
                        reconciliation.subledgerBalance,
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <small className="text-body-secondary">
                      Hesap Bakiyesi
                    </small>

                    <div className="fw-semibold">
                      {money(
                        reconciliation.accountBalance,
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <small className="text-body-secondary">
                      Fark
                    </small>

                    <div
                      className={`fw-semibold ${
                        Number(
                          reconciliation.difference,
                        ) === 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {money(
                        reconciliation.difference,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {statement.items?.length ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Fiş No</th>
                      <th>Kaynak</th>
                      <th className="text-end">
                        Borç
                      </th>
                      <th className="text-end">
                        Alacak
                      </th>
                      <th className="text-end">
                        Bakiye
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {statement.items.map(
                      (item, index) => (
                        <tr key={index}>
                          <td>
                            {item.entry.date}
                          </td>

                          <td>
                            {item.entry.number}
                          </td>

                          <td>
                            {item.entry.sourceType}
                          </td>

                          <td className="text-end">
                            {money(
                              item.entry.debit,
                            )}
                          </td>

                          <td className="text-end">
                            {money(
                              item.entry.credit,
                            )}
                          </td>

                          <td className="text-end fw-semibold">
                            {money(
                              item.balance,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-body">
                Henüz hareket bulunmuyor.
              </div>
            )}
          </div>
        )}
    </section>
  );
}