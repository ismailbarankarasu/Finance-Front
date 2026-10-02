import { useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import {
  CompanyRole,
  periodStatusLabel,
} from "../../utils/accounting";

const initialForm = {
  name: "",
  startDate: "",
  endDate: "",
};

export default function PeriodsPage() {
  const {
    activeCompany,
    activeCompanyId,

    periods,
    activePeriodId,

    periodsStatus,
    periodsError,

    setActivePeriodId,
    refreshPeriods,
  } = useAccounting();

  const [form, setForm] =
    useState(initialForm);

  const [submitStatus, setSubmitStatus] =
    useState("idle");

  const [submitError, setSubmitError] =
    useState("");

  const canManagePeriods =
    activeCompany?.role === CompanyRole.Admin ||
    activeCompany?.role ===
      CompanyRole.Accountant;

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!activeCompanyId) {
      setSubmitError(
        "Önce aktif bir şirket seçmelisiniz.",
      );

      return;
    }

    const name = form.name.trim();

    if (!name) {
      setSubmitError(
        "Mali dönem adı zorunludur.",
      );

      return;
    }

    if (
      !form.startDate ||
      !form.endDate
    ) {
      setSubmitError(
        "Başlangıç ve bitiş tarihleri zorunludur.",
      );

      return;
    }

    if (form.startDate > form.endDate) {
      setSubmitError(
        "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
      );

      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      const { data } = await api.post(
        `/companies/${activeCompanyId}/periods`,
        {
          name,
          startDate: form.startDate,
          endDate: form.endDate,
        },
      );

      setForm(initialForm);

      await refreshPeriods();

      setActivePeriodId(data.id);

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(
        error.response?.data?.message ??
          "Mali dönem oluşturulamadı.",
      );
    }
  }

  if (!activeCompany) {
    return (
      <section className="container py-4">
        <div
          className="alert alert-warning"
          role="alert"
        >
          Mali dönemleri görüntülemek için
          önce bir şirket seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className="container py-4">
      <header className="mb-4">
        <h1 className="h3">
          Mali Dönemler
        </h1>

        <p className="text-body-secondary mb-0">
          <strong>
            {activeCompany.name}
          </strong>{" "}
          için çalışma dönemlerini yönetin.
        </p>
      </header>

      <div className="row g-4">
        <div
          className={
            canManagePeriods
              ? "col-lg-8"
              : "col-12"
          }
        >
          <div className="card">
            <div className="card-header">
              <h2 className="h5 mb-0">
                Dönem Listesi
              </h2>
            </div>

            {periodsStatus === "loading" ? (
              <div className="card-body">
                <p
                  role="status"
                  className="mb-0"
                >
                  Mali dönemler yükleniyor…
                </p>
              </div>
            ) : periodsStatus === "error" ? (
              <div className="card-body">
                <div
                  className="alert alert-danger mb-0"
                  role="alert"
                >
                  {periodsError}
                </div>
              </div>
            ) : periods.length === 0 ? (
              <div className="card-body">
                <p className="mb-0">
                  Bu şirkete ait mali dönem
                  bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Dönem</th>
                      <th>Başlangıç</th>
                      <th>Bitiş</th>
                      <th>Durum</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {periods.map((period) => (
                      <tr key={period.id}>
                        <td className="fw-semibold">
                          {period.name}
                        </td>

                        <td>
                          {period.startDate}
                        </td>

                        <td>
                          {period.endDate}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              period.status === 1
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {periodStatusLabel(
                              period.status,
                            )}
                          </span>
                        </td>

                        <td className="text-end">
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              period.id ===
                              activePeriodId
                                ? "btn-success"
                                : "btn-outline-primary"
                            }`}
                            disabled={
                              period.id ===
                              activePeriodId
                            }
                            onClick={() =>
                              setActivePeriodId(
                                period.id,
                              )
                            }
                          >
                            {period.id ===
                            activePeriodId
                              ? "Seçili"
                              : "Aktif Yap"}
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

        {canManagePeriods && (
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">
                <h2 className="h5 mb-0">
                  Yeni Mali Dönem
                </h2>
              </div>

              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="periodName"
                    >
                      Dönem Adı
                    </label>

                    <input
                      id="periodName"
                      type="text"
                      className="form-control"
                      maxLength={80}
                      required
                      placeholder="Örn. 2026"
                      value={form.name}
                      onChange={(event) =>
                        updateForm(
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="periodStartDate"
                    >
                      Başlangıç
                    </label>

                    <input
                      id="periodStartDate"
                      type="date"
                      className="form-control"
                      required
                      value={form.startDate}
                      onChange={(event) =>
                        updateForm(
                          "startDate",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="periodEndDate"
                    >
                      Bitiş
                    </label>

                    <input
                      id="periodEndDate"
                      type="date"
                      className="form-control"
                      required
                      value={form.endDate}
                      onChange={(event) =>
                        updateForm(
                          "endDate",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {submitError && (
                    <div
                      className="alert alert-danger"
                      role="alert"
                    >
                      {submitError}
                    </div>
                  )}

                  {submitStatus ===
                    "success" && (
                    <div
                      className="alert alert-success"
                      role="status"
                    >
                      Mali dönem oluşturuldu.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={
                      submitStatus ===
                      "loading"
                    }
                  >
                    {submitStatus === "loading"
                      ? "Kaydediliyor…"
                      : "Dönem Oluştur"}
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