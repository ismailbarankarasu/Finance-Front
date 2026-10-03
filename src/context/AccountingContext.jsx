import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./useAuth";
import { AccountingContext } from "./useAccounting";

const COMPANY_STORAGE_KEY = "activeCompanyId";
const PERIOD_STORAGE_KEY = "activePeriodId";

function toStoredId(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : null;
}

export function AccountingProvider({ children }) {
  const { isAuth, sessionStatus } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [activeCompanyId, setActiveCompanyIdState] = useState(() =>
    toStoredId(localStorage.getItem(COMPANY_STORAGE_KEY)),
  );

  const [activePeriodId, setActivePeriodIdState] = useState(() =>
    toStoredId(localStorage.getItem(PERIOD_STORAGE_KEY)),
  );

  const [companiesStatus, setCompaniesStatus] = useState("idle");
  const [periodsStatus, setPeriodsStatus] = useState("idle");

  const [companiesError, setCompaniesError] = useState("");
  const [periodsError, setPeriodsError] = useState("");

  const loadCompanies = useCallback(async (signal) => {
    setCompaniesStatus("loading");
    setCompaniesError("");

    try {
      const { data } = await api.get("/companies", { signal });

      if (signal?.aborted) return;

      if (!Array.isArray(data)) {
        throw new Error("Şirket listesi geçersiz.");
      }

      setCompanies(data);

      setActiveCompanyIdState((currentId) => {
        const currentExists = data.some(
          (company) => company.id === currentId && company.isActive,
        );

        if (currentExists) {
          return currentId;
        }

        const firstCompany =
          data.find((company) => company.isActive) ?? data[0] ?? null;

        const nextId = firstCompany?.id ?? null;

        if (nextId) {
          localStorage.setItem(COMPANY_STORAGE_KEY, String(nextId));
        } else {
          localStorage.removeItem(COMPANY_STORAGE_KEY);
        }

        return nextId;
      });

      setCompaniesStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setCompaniesStatus("error");
      setCompaniesError(
        error.response?.data?.message ??
          "Şirket bilgileri alınırken bir hata oluştu.",
      );
    }
  }, []);

  const loadPeriods = useCallback(async (companyId, signal) => {
    if (!companyId) {
      setPeriods([]);
      setActivePeriodIdState(null);
      localStorage.removeItem(PERIOD_STORAGE_KEY);
      return;
    }

    setPeriodsStatus("loading");
    setPeriodsError("");

    try {
      const { data } = await api.get(`/companies/${companyId}/periods`, {
        signal,
      });

      if (signal?.aborted) return;

      if (!Array.isArray(data)) {
        throw new Error("Mali dönem listesi geçersiz.");
      }

      setPeriods(data);

      setActivePeriodIdState((currentId) => {
        const currentExists = data.some(
          (period) => period.id === currentId,
        );

        if (currentExists) {
          return currentId;
        }

        const today = new Date().toISOString().slice(0, 10);

        const currentOpenPeriod = data.find(
          (period) =>
            period.status === 1 &&
            period.startDate <= today &&
            period.endDate >= today,
        );

        const firstOpenPeriod = data.find((period) => period.status === 1);

        const nextPeriod =
          currentOpenPeriod ??
          firstOpenPeriod ??
          data[data.length - 1] ??
          null;

        const nextId = nextPeriod?.id ?? null;

        if (nextId) {
          localStorage.setItem(PERIOD_STORAGE_KEY, String(nextId));
        } else {
          localStorage.removeItem(PERIOD_STORAGE_KEY);
        }

        return nextId;
      });

      setPeriodsStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setPeriodsStatus("error");
      setPeriodsError(
        error.response?.data?.message ??
          "Mali dönemler alınırken bir hata oluştu.",
      );
    }
  }, []);

  const sessionReady = isAuth && sessionStatus === "success";
  const [previousSessionReady, setPreviousSessionReady] = useState(sessionReady);
  if (previousSessionReady !== sessionReady) {
    setPreviousSessionReady(sessionReady);
    if (!sessionReady) {
      setCompanies([]);
      setPeriods([]);
    }
  }

  useEffect(() => {
    if (!isAuth || sessionStatus !== "success") {
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadCompanies(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isAuth, sessionStatus, loadCompanies]);

  useEffect(() => {
    if (!isAuth || sessionStatus !== "success" || !activeCompanyId) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadPeriods(activeCompanyId, controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    isAuth,
    sessionStatus,
    activeCompanyId,
    loadPeriods,
  ]);

  function setActiveCompanyId(companyId) {
    const nextId = toStoredId(companyId);

    setActiveCompanyIdState(nextId);
    setActivePeriodIdState(null);
    setPeriods([]);

    localStorage.removeItem(PERIOD_STORAGE_KEY);

    if (nextId) {
      localStorage.setItem(COMPANY_STORAGE_KEY, String(nextId));
    } else {
      localStorage.removeItem(COMPANY_STORAGE_KEY);
    }
  }

  function setActivePeriodId(periodId) {
    const nextId = toStoredId(periodId);

    setActivePeriodIdState(nextId);

    if (nextId) {
      localStorage.setItem(PERIOD_STORAGE_KEY, String(nextId));
    } else {
      localStorage.removeItem(PERIOD_STORAGE_KEY);
    }
  }

  const activeCompany = useMemo(
    () =>
      companies.find((company) => company.id === activeCompanyId) ?? null,
    [companies, activeCompanyId],
  );

  const activePeriod = useMemo(
    () =>
      periods.find((period) => period.id === activePeriodId) ?? null,
    [periods, activePeriodId],
  );

  const value = {
    companies,
    periods,

    activeCompany,
    activeCompanyId,

    activePeriod,
    activePeriodId,

    companiesStatus,
    periodsStatus,

    companiesError,
    periodsError,

    setActiveCompanyId,
    setActivePeriodId,

    refreshCompanies: loadCompanies,
    refreshPeriods: () => loadPeriods(activeCompanyId),
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
}