import { useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import { companyRoleLabel } from "../../utils/accounting";

const initialForm = {
  name: "",
  taxNumber: "",
};

export default function CompaniesPage() {
  const {
    companies,
    activeCompanyId,

    companiesStatus,
    companiesError,

    setActiveCompanyId,
    refreshCompanies,
  } = useAccounting();

  const [form, setForm] = useState(initialForm);

  const [submitStatus, setSubmitStatus] =
    useState("idle");

  const [submitError, setSubmitError] =
    useState("");

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const taxNumber = form.taxNumber.trim();

    if (name.length < 2) {
      setSubmitError(
        "Şirket adı en az 2 karakter olmalıdır.",
      );

      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      const { data } = await api.post(
        "/companies",
        {
          name,
          taxNumber: taxNumber || null,
          isActive: true,
        },
      );

      setForm(initialForm);

      setActiveCompanyId(data.id);

      await refreshCompanies();

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(
        error.response?.data?.message ??
          "Şirket oluşturulamadı.",
      );
    }
  }

  return (
    <section className="container py-4">
      <header className="mb-4">
        <h1 className="h3">
          Şirket Yönetimi
        </h1>

        <p className="text-body-secondary mb-0">
          Muhasebe işlemlerinin yürütüleceği
          şirketleri yönetin.
        </p>
      </header>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h2 className="h5 mb-0">
                Şirketler
              </h2>
            </div>

            {companiesStatus === "loading" ? (
              <div className="card-body">
                <p
                  className="mb-0"
                  role="status"
                >
                  Şirketler yükleniyor…
                </p>
              </div>
            ) : companiesStatus === "error" ? (
              <div className="card-body">
                <div
                  className="alert alert-danger mb-0"
                  role="alert"
                >
                  {companiesError}
                </div>
              </div>
            ) : companies.length === 0 ? (
              <div className="card-body">
                <p className="mb-0">
                  Henüz şirket bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Şirket</th>
                      <th>Vergi No</th>
                      <th>Para Birimi</th>
                      <th>Rol</th>
                      <th>Durum</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td className="fw-semibold">
                          {company.name}
                        </td>

                        <td>
                          {company.taxNumber || "—"}
                        </td>

                        <td>
                          {company.currencyCode}
                        </td>

                        <td>
                          {companyRoleLabel(
                            company.role,
                          )}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              company.isActive
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {company.isActive
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </td>

                        <td className="text-end">
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              company.id ===
                              activeCompanyId
                                ? "btn-success"
                                : "btn-outline-primary"
                            }`}
                            disabled={
                              !company.isActive ||
                              company.id ===
                                activeCompanyId
                            }
                            onClick={() =>
                              setActiveCompanyId(
                                company.id,
                              )
                            }
                          >
                            {company.id ===
                            activeCompanyId
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

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h2 className="h5 mb-0">
                Yeni Şirket
              </h2>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="companyName"
                  >
                    Şirket Adı
                  </label>

                  <input
                    id="companyName"
                    type="text"
                    className="form-control"
                    minLength={2}
                    maxLength={160}
                    required
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
                    htmlFor="taxNumber"
                  >
                    Vergi Numarası
                  </label>

                  <input
                    id="taxNumber"
                    type="text"
                    className="form-control"
                    value={form.taxNumber}
                    onChange={(event) =>
                      updateForm(
                        "taxNumber",
                        event.target.value,
                      )
                    }
                  />

                  <div className="form-text">
                    İsteğe bağlıdır.
                  </div>
                </div>

                {submitError && (
                  <div
                    className="alert alert-danger"
                    role="alert"
                  >
                    {submitError}
                  </div>
                )}

                {submitStatus === "success" && (
                  <div
                    className="alert alert-success"
                    role="status"
                  >
                    Şirket başarıyla oluşturuldu.
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={
                    submitStatus === "loading"
                  }
                >
                  {submitStatus === "loading"
                    ? "Kaydediliyor…"
                    : "Şirket Oluştur"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}