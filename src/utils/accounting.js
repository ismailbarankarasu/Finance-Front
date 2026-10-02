export const CompanyRole = {
  Admin: 1,
  Accountant: 2,
  Sales: 3,
  Reader: 4,
};

export const PeriodStatus = {
  Open: 1,
  Locked: 2,
};

export function companyRoleLabel(role) {
  switch (role) {
    case CompanyRole.Admin:
      return "Yönetici";

    case CompanyRole.Accountant:
      return "Muhasebeci";

    case CompanyRole.Sales:
      return "Satış";

    case CompanyRole.Reader:
      return "Salt Okur";

    default:
      return "Bilinmiyor";
  }
}

export function periodStatusLabel(status) {
  switch (status) {
    case PeriodStatus.Open:
      return "Açık";

    case PeriodStatus.Locked:
      return "Kilitli";

    default:
      return "Bilinmiyor";
  }
}

export const AccountClass = {
  Asset: 1,
  Liability: 2,
  Equity: 3,
  Income: 4,
  Expense: 5,
};

export const JournalStatus = {
  Draft: 1,
  Posted: 2,
};

export function accountClassLabel(value) {
  switch (value) {
    case AccountClass.Asset:
      return "Varlık";
    case AccountClass.Liability:
      return "Yükümlülük";
    case AccountClass.Equity:
      return "Özkaynak";
    case AccountClass.Income:
      return "Gelir";
    case AccountClass.Expense:
      return "Gider";
    default:
      return "Bilinmiyor";
  }
}

export function journalStatusLabel(value) {
  switch (value) {
    case JournalStatus.Draft:
      return "Taslak";
    case JournalStatus.Posted:
      return "Onaylı";
    default:
      return "Bilinmiyor";
  }
}

export const PartyType = {
  Customer: 1,
  Supplier: 2,
  Both: 3,
};

export function partyTypeLabel(value) {
  switch (value) {
    case PartyType.Customer:
      return "Müşteri";

    case PartyType.Supplier:
      return "Tedarikçi";

    case PartyType.Both:
      return "Müşteri / Tedarikçi";

    default:
      return "Bilinmiyor";
  }
}

export const InvoiceType = {
  Sales: 1,
  Purchase: 2,
};

export const InvoiceStatus = {
  Draft: 1,
  Approved: 2,
  PartiallyPaid: 3,
  Paid: 4,
  Cancelled: 5,
};

export function invoiceTypeLabel(value) {
  switch (value) {
    case InvoiceType.Sales:
      return "Satış";

    case InvoiceType.Purchase:
      return "Alış";

    default:
      return "Bilinmiyor";
  }
}

export function invoiceStatusLabel(value) {
  switch (value) {
    case InvoiceStatus.Draft:
      return "Taslak";

    case InvoiceStatus.Approved:
      return "Onaylı";

    case InvoiceStatus.PartiallyPaid:
      return "Kısmi Ödendi";

    case InvoiceStatus.Paid:
      return "Ödendi";

    case InvoiceStatus.Cancelled:
      return "İptal";

    default:
      return "Bilinmiyor";
  }
}

export const TreasuryType = {
  Cash: 1,
  Bank: 2,
};

export const PaymentDirection = {
  Collection: 1,
  Disbursement: 2,
};

export function treasuryTypeLabel(value) {
  switch (value) {
    case TreasuryType.Cash:
      return "Kasa";

    case TreasuryType.Bank:
      return "Banka";

    default:
      return "Bilinmiyor";
  }
}

export function paymentDirectionLabel(value) {
  switch (value) {
    case PaymentDirection.Collection:
      return "Tahsilat";

    case PaymentDirection.Disbursement:
      return "Ödeme";

    default:
      return "Bilinmiyor";
  }
}