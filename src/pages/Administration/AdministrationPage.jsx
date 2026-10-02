import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";

import { CompanyRole, companyRoleLabel } from "../../utils/accounting";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("tr-TR");
}

function safeJson(value) {
  if (!value) return null;

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function outboxBadge(status) {
  switch (status) {
    case "Sent":
      return "text-bg-success";

    case "Failed":
      return "text-bg-danger";

    case "Pending":
      return "text-bg-warning";

    case "Processing":
      return "text-bg-primary";

    case "Skipped":
      return "text-bg-secondary";

    default:
      return "text-bg-secondary";
  }
}

export default function AdministrationPage() {
  const { activeCompany, activeCompanyId } = useAccounting();

  const [tab, setTab] = useState("audit");

  const [members, setMembers] = useState([]);

  const [auditLogs, setAuditLogs] = useState([]);

  const [auditTotal, setAuditTotal] = useState(0);

  const [messages, setMessages] = useState([]);

  const [messageTotal, setMessageTotal] = useState(0);

  const [settings, setSettings] = useState({
    timeZoneId: "Europe/Istanbul",
    reminderHour: 9,
    contactEmail: "",
  });

  const [memberForm, setMemberForm] = useState({
    userId: "",
    role: CompanyRole.Reader,
  });

  const [auditFilter, setAuditFilter] = useState({
    entityType: "",
    from: "",
    to: "",
  });

  const [messageStatus, setMessageStatus] = useState("");

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const role = activeCompany?.role;

  const isAdmin = role === CompanyRole.Admin;

  const canAudit =
    role === CompanyRole.Admin || role === CompanyRole.Accountant;

  const availableTabs = useMemo(() => {
    const items = [];

    if (isAdmin) {
      items.push("members");
    }

    if (canAudit) {
      items.push("audit");
      items.push("automation");
    }

    if (isAdmin) {
      items.push("settings");
    }

    return items;
  }, [isAdmin, canAudit]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(tab)) {
      setTab(availableTabs[0]);
    }
  }, [availableTabs, tab]);

  useEffect(() => {
    setMembers([]);
    setAuditLogs([]);
    setMessages([]);
    setError("");
    setSuccess("");
  }, [activeCompanyId]);

  async function loadMembers() {
    if (!activeCompanyId || !isAdmin) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const { data } = await api.get(`/companies/${activeCompanyId}/members`);

      setMembers(data ?? []);

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(error.response?.data?.message ?? "Şirket üyeleri yüklenemedi.");
    }
  }

  async function loadAudit() {
    if (!activeCompanyId || !canAudit) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const params = {
        page: 1,
        pageSize: 50,
      };

      if (auditFilter.entityType.trim()) {
        params.entityType = auditFilter.entityType.trim();
      }

      if (auditFilter.from) {
        params.from = new Date(`${auditFilter.from}T00:00:00`).toISOString();
      }

      if (auditFilter.to) {
        params.to = new Date(`${auditFilter.to}T23:59:59`).toISOString();
      }

      const { data } = await api.get(
        `/companies/${activeCompanyId}/audit-logs`,
        {
          params,
        },
      );

      setAuditLogs(data.items ?? []);

      setAuditTotal(Number(data.totalCount ?? 0));

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(error.response?.data?.message ?? "Audit kayıtları yüklenemedi.");
    }
  }

  async function loadMessages() {
    if (!activeCompanyId || !canAudit) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/automation/messages`,
        {
          params: {
            status: messageStatus || undefined,

            page: 1,
            pageSize: 50,
          },
        },
      );

      setMessages(data.items ?? []);

      setMessageTotal(Number(data.totalCount ?? 0));

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(
        error.response?.data?.message ?? "Otomasyon mesajları yüklenemedi.",
      );
    }
  }

  async function loadSettings() {
    if (!activeCompanyId || !isAdmin) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/automation/settings`,
      );

      setSettings({
        timeZoneId: data.timeZoneId ?? "Europe/Istanbul",

        reminderHour: data.reminderHour ?? 9,

        contactEmail: data.contactEmail ?? "",
      });

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(
        error.response?.data?.message ?? "Bildirim ayarları yüklenemedi.",
      );
    }
  }

  useEffect(() => {
    if (!activeCompanyId) return;

    if (tab === "members") {
      loadMembers();
    }

    if (tab === "audit") {
      loadAudit();
    }

    if (tab === "automation") {
      loadMessages();
    }

    if (tab === "settings") {
      loadSettings();
    }
  }, [activeCompanyId, tab, messageStatus]);

  async function addMember(event) {
    event.preventDefault();

    const userId = Number(memberForm.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      setError("Geçerli bir kullanıcı ID girin.");

      return;
    }

    setStatus("loading");
    setError("");
    setSuccess("");

    try {
      await api.post(`/companies/${activeCompanyId}/members`, {
        userId,

        role: Number(memberForm.role),

        isActive: true,
      });

      setMemberForm({
        userId: "",
        role: CompanyRole.Reader,
      });

      await loadMembers();

      setSuccess("Kullanıcı şirkete eklendi.");
    } catch (error) {
      setStatus("error");

      setError(error.response?.data?.message ?? "Kullanıcı eklenemedi.");
    }
  }

  async function changeRole(member, role) {
    setError("");
    setSuccess("");

    try {
      await api.put(`/companies/${activeCompanyId}/members/${member.userId}`, {
        userId: member.userId,

        role: Number(role),

        isActive: member.isActive,
      });

      await loadMembers();

      setSuccess("Kullanıcı rolü güncellendi.");
    } catch (error) {
      setError(error.response?.data?.message ?? "Rol güncellenemedi.");
    }
  }

  async function removeMember(member) {
    const confirmed = window.confirm(
      `#${member.userId} kullanıcısı şirketten çıkarılsın mı?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/companies/${activeCompanyId}/members/${member.userId}`,
      );

      await loadMembers();

      setSuccess("Kullanıcı üyeliği pasif hale getirildi.");
    } catch (error) {
      setError(error.response?.data?.message ?? "Kullanıcı çıkarılamadı.");
    }
  }

  async function retryMessage(message) {
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/companies/${activeCompanyId}/automation/messages/${message.id}/retry`,
      );

      await loadMessages();

      setSuccess("Mesaj yeniden kuyruğa alındı.");
    } catch (error) {
      setError(
        error.response?.data?.message ?? "Mesaj tekrar kuyruğa alınamadı.",
      );
    }
  }

  async function saveSettings(event) {
    event.preventDefault();

    const hour = Number(settings.reminderHour);

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      setError("Hatırlatma saati 0-23 arasında olmalıdır.");

      return;
    }

    setStatus("loading");
    setError("");
    setSuccess("");

    try {
      await api.put(`/companies/${activeCompanyId}/automation/settings`, {
        timeZoneId: settings.timeZoneId.trim(),

        reminderHour: hour,

        contactEmail: settings.contactEmail.trim() || null,
      });

      setSuccess("Bildirim ayarları kaydedildi.");

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(
        error.response?.data?.message ?? "Bildirim ayarları kaydedilemedi.",
      );
    }
  }

  if (!activeCompany) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Yönetim işlemleri için aktif şirket seçmelisiniz.
        </div>
      </section>
    );
  }

  if (!isAdmin && !canAudit) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Bu kullanıcı rolünün yönetim ekranına erişim yetkisi bulunmuyor.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='mb-4'>
        <h1 className='h3'>Yönetim Merkezi</h1>

        <p className='text-body-secondary mb-0'>{activeCompany.name}</p>
      </header>

      {error && (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      )}

      {success && (
        <div className='alert alert-success' role='status'>
          {success}
        </div>
      )}

      <ul className='nav nav-tabs mb-4'>
        {isAdmin && (
          <li className='nav-item'>
            <button
              type='button'
              className={`nav-link ${tab === "members" ? "active" : ""}`}
              onClick={() => setTab("members")}
            >
              Üyeler & Roller
            </button>
          </li>
        )}

        {canAudit && (
          <>
            <li className='nav-item'>
              <button
                type='button'
                className={`nav-link ${tab === "audit" ? "active" : ""}`}
                onClick={() => setTab("audit")}
              >
                Audit Log
              </button>
            </li>

            <li className='nav-item'>
              <button
                type='button'
                className={`nav-link ${tab === "automation" ? "active" : ""}`}
                onClick={() => setTab("automation")}
              >
                Otomasyon
              </button>
            </li>
          </>
        )}

        {isAdmin && (
          <li className='nav-item'>
            <button
              type='button'
              className={`nav-link ${tab === "settings" ? "active" : ""}`}
              onClick={() => setTab("settings")}
            >
              Bildirim Ayarları
            </button>
          </li>
        )}
      </ul>

      {tab === "members" && isAdmin && (
        <MembersTab
          members={members}
          memberForm={memberForm}
          setMemberForm={setMemberForm}
          addMember={addMember}
          changeRole={changeRole}
          removeMember={removeMember}
        />
      )}

      {tab === "audit" && canAudit && (
        <AuditTab
          logs={auditLogs}
          total={auditTotal}
          filter={auditFilter}
          setFilter={setAuditFilter}
          loadAudit={loadAudit}
        />
      )}

      {tab === "automation" && canAudit && (
        <AutomationTab
          messages={messages}
          total={messageTotal}
          messageStatus={messageStatus}
          setMessageStatus={setMessageStatus}
          retryMessage={retryMessage}
        />
      )}

      {tab === "settings" && isAdmin && (
        <SettingsTab
          settings={settings}
          setSettings={setSettings}
          saveSettings={saveSettings}
        />
      )}

      {status === "loading" && (
        <div className='text-body-secondary mt-3'>
          İşlem gerçekleştiriliyor…
        </div>
      )}
    </section>
  );
}

function MembersTab({
  members,
  memberForm,
  setMemberForm,
  addMember,
  changeRole,
  removeMember,
}) {
  return (
    <div className='row g-4'>
      <div className='col-xl-8'>
        <div className='card'>
          <div className='card-header'>
            <h2 className='h5 mb-0'>Şirket Üyeleri</h2>
          </div>

          {members.length === 0 ? (
            <div className='card-body'>Üye bulunamadı.</div>
          ) : (
            <div className='table-responsive'>
              <table className='table align-middle mb-0'>
                <thead>
                  <tr>
                    <th>Kullanıcı ID</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((member) => (
                    <tr key={member.userId}>
                      <td className='fw-semibold'>#{member.userId}</td>

                      <td>
                        <select
                          className='form-select form-select-sm'
                          value={member.role}
                          disabled={!member.isActive}
                          onChange={(event) =>
                            changeRole(member, event.target.value)
                          }
                        >
                          <option value={CompanyRole.Admin}>Yönetici</option>

                          <option value={CompanyRole.Accountant}>
                            Muhasebeci
                          </option>

                          <option value={CompanyRole.Sales}>Satış</option>

                          <option value={CompanyRole.Reader}>Salt Okur</option>
                        </select>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            member.isActive
                              ? "text-bg-success"
                              : "text-bg-secondary"
                          }`}
                        >
                          {member.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>

                      <td className='text-end'>
                        {member.isActive && (
                          <button
                            type='button'
                            className='btn btn-outline-danger btn-sm'
                            onClick={() => removeMember(member)}
                          >
                            Çıkar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className='col-xl-4'>
        <div className='card'>
          <div className='card-header'>
            <h2 className='h5 mb-0'>Üye Ekle</h2>
          </div>

          <div className='card-body'>
            <form onSubmit={addMember}>
              <div className='mb-3'>
                <label className='form-label'>Kullanıcı ID</label>

                <input
                  type='number'
                  min='1'
                  className='form-control'
                  value={memberForm.userId}
                  onChange={(event) =>
                    setMemberForm((previous) => ({
                      ...previous,

                      userId: event.target.value,
                    }))
                  }
                  required
                />

                <div className='form-text'>
                  Kullanıcı sistemde daha önce kayıt olmuş olmalıdır.
                </div>
              </div>

              <div className='mb-3'>
                <label className='form-label'>Rol</label>

                <select
                  className='form-select'
                  value={memberForm.role}
                  onChange={(event) =>
                    setMemberForm((previous) => ({
                      ...previous,

                      role: Number(event.target.value),
                    }))
                  }
                >
                  <option value={CompanyRole.Admin}>Yönetici</option>

                  <option value={CompanyRole.Accountant}>Muhasebeci</option>

                  <option value={CompanyRole.Sales}>Satış</option>

                  <option value={CompanyRole.Reader}>Salt Okur</option>
                </select>
              </div>

              <button className='btn btn-primary w-100'>Üye Ekle</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditTab({ logs, total, filter, setFilter, loadAudit }) {
  return (
    <>
      <div className='card mb-4'>
        <div className='card-body'>
          <div className='row g-3 align-items-end'>
            <div className='col-md-4'>
              <label className='form-label'>Entity Type</label>

              <input
                className='form-control'
                placeholder='Örn. Invoice'
                value={filter.entityType}
                onChange={(event) =>
                  setFilter((previous) => ({
                    ...previous,

                    entityType: event.target.value,
                  }))
                }
              />
            </div>

            <div className='col-md-3'>
              <label className='form-label'>Başlangıç</label>

              <input
                type='date'
                className='form-control'
                value={filter.from}
                onChange={(event) =>
                  setFilter((previous) => ({
                    ...previous,

                    from: event.target.value,
                  }))
                }
              />
            </div>

            <div className='col-md-3'>
              <label className='form-label'>Bitiş</label>

              <input
                type='date'
                className='form-control'
                value={filter.to}
                onChange={(event) =>
                  setFilter((previous) => ({
                    ...previous,

                    to: event.target.value,
                  }))
                }
              />
            </div>

            <div className='col-md-2'>
              <button
                type='button'
                className='btn btn-primary w-100'
                onClick={loadAudit}
              >
                Filtrele
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='card'>
        <div className='card-header d-flex justify-content-between'>
          <h2 className='h5 mb-0'>Audit Log</h2>

          <span className='text-body-secondary'>{total} kayıt</span>
        </div>

        {logs.length === 0 ? (
          <div className='card-body'>Audit kaydı bulunamadı.</div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle mb-0'>
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Kullanıcı</th>
                  <th>İşlem</th>
                  <th>Entity</th>
                  <th>Kayıt</th>
                  <th>Detay</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.timestampUtc)}</td>

                    <td>#{log.actorUserId}</td>

                    <td>
                      <span className='badge text-bg-primary'>
                        {log.action}
                      </span>
                    </td>

                    <td>{log.entityType}</td>

                    <td>{log.entityId}</td>

                    <td>
                      <details>
                        <summary className='btn btn-outline-secondary btn-sm'>
                          Görüntüle
                        </summary>

                        <div
                          className='mt-3'
                          style={{
                            minWidth: 350,
                          }}
                        >
                          {log.reason && (
                            <>
                              <strong>Gerekçe</strong>

                              <p>{log.reason}</p>
                            </>
                          )}

                          {log.before && (
                            <>
                              <strong>Önce</strong>

                              <pre className='bg-body-tertiary p-2 rounded small'>
                                {safeJson(log.before)}
                              </pre>
                            </>
                          )}

                          {log.after && (
                            <>
                              <strong>Sonra</strong>

                              <pre className='bg-body-tertiary p-2 rounded small'>
                                {safeJson(log.after)}
                              </pre>
                            </>
                          )}

                          <small className='text-body-secondary'>
                            Correlation: {log.correlationId}
                          </small>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AutomationTab({
  messages,
  total,
  messageStatus,
  setMessageStatus,
  retryMessage,
}) {
  return (
    <div className='card'>
      <div className='card-header d-flex flex-wrap justify-content-between gap-3'>
        <div>
          <h2 className='h5 mb-0'>Outbox Mesajları</h2>

          <small className='text-body-secondary'>{total} kayıt</small>
        </div>

        <select
          className='form-select'
          style={{
            width: 180,
          }}
          value={messageStatus}
          onChange={(event) => setMessageStatus(event.target.value)}
        >
          <option value=''>Tüm Durumlar</option>

          <option value='Pending'>Pending</option>

          <option value='Processing'>Processing</option>

          <option value='Sent'>Sent</option>

          <option value='Failed'>Failed</option>

          <option value='Skipped'>Skipped</option>
        </select>
      </div>

      {messages.length === 0 ? (
        <div className='card-body'>Mesaj bulunamadı.</div>
      ) : (
        <div className='table-responsive'>
          <table className='table align-middle mb-0'>
            <thead>
              <tr>
                <th>#</th>
                <th>Olay</th>
                <th>Durum</th>
                <th>Deneme</th>
                <th>Sonraki Deneme</th>
                <th>Gönderim</th>
                <th>Hata</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>#{message.id}</td>

                  <td>{message.eventType}</td>

                  <td>
                    <span className={`badge ${outboxBadge(message.status)}`}>
                      {message.status}
                    </span>
                  </td>

                  <td>{message.attempts}</td>

                  <td>{formatDate(message.nextAttemptAtUtc)}</td>

                  <td>{formatDate(message.sentAtUtc)}</td>

                  <td>
                    {message.lastError ? (
                      <span className='text-danger' title={message.lastError}>
                        {message.lastError}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    {message.status === "Failed" && (
                      <button
                        type='button'
                        className='btn btn-outline-primary btn-sm'
                        onClick={() => retryMessage(message)}
                      >
                        Tekrar Dene
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ settings, setSettings, saveSettings }) {
  return (
    <div className='row'>
      <div className='col-lg-6'>
        <form className='card' onSubmit={saveSettings}>
          <div className='card-header'>
            <h2 className='h5 mb-0'>Bildirim Ayarları</h2>
          </div>

          <div className='card-body'>
            <div className='mb-3'>
              <label className='form-label'>Saat Dilimi</label>

              <input
                className='form-control'
                value={settings.timeZoneId}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,

                    timeZoneId: event.target.value,
                  }))
                }
                required
              />

              <div className='form-text'>Türkiye için: Europe/Istanbul</div>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Vade Hatırlatma Saati</label>

              <input
                type='number'
                min='0'
                max='23'
                className='form-control'
                value={settings.reminderHour}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,

                    reminderHour: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className='mb-3'>
              <label className='form-label'>Şirket İletişim E-postası</label>

              <input
                type='email'
                className='form-control'
                value={settings.contactEmail}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,

                    contactEmail: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className='card-footer text-end'>
            <button className='btn btn-primary'>Ayarları Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}
