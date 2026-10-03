# Finance Front — Ön Muhasebe ve Muhasebe Yönetim Arayüzü

<p align="center">
  React tabanlı, şirket ve mali dönem odaklı ön muhasebe / muhasebe yönetim arayüzü.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white" alt="Bootstrap 5.3" />
  <img src="https://img.shields.io/badge/Axios-1.x-5A29E4?logo=axios&logoColor=white" alt="Axios" />
  <img src="https://img.shields.io/badge/SweetAlert2-11.x-7066E0" alt="SweetAlert2" />
</p>

## Proje Hakkında

**Finance Front**, kişisel gelir-gider uygulamasından şirket ve mali dönem bazlı çalışan bir **ön muhasebe / muhasebe sistemine** dönüştürülen React arayüzüdür.

Uygulama; şirket ve mali dönem yönetimi, hesap planı, çift taraflı yevmiye, cari hesaplar, ürün ve stok, alış/satış faturaları, tahsilat/ödeme, kasa-banka, virman, mali raporlar, mutabakat ve dönem kapanışı gibi temel muhasebe akışlarını tek bir arayüzde birleştirir.

Frontend bütün HTTP iletişimini merkezi Axios istemcisi üzerinden yürütür ve muhasebe kurallarında API'yi nihai otorite olarak kabul eder.

> Bu proje eğitim amaçlı bir case çalışmasıdır. Yasal e-Fatura, e-Defter veya güncel vergi mevzuatı uyumluluğu iddiası taşımaz.

### Backend

Bu arayüz aşağıdaki ASP.NET Core API ile birlikte çalışır:

**Finans API:**  
https://github.com/ismailbarankarasu/FinansApi

---

## Öne Çıkan Özellikler

- JWT tabanlı giriş ve korumalı route yapısı
- Çoklu şirket desteği
- Aktif şirket ve mali dönem seçimi
- Açık / kilitli mali dönem kontrolü
- Standart hesap planı oluşturma
- Çift taraflı yevmiye kayıtları
- Canlı borç / alacak denklik kontrolü
- Manuel fiş onaylama ve kontrollü ters kayıt
- Müşteri / tedarikçi cari kartları
- Cari ekstre, bakiye ve açık fatura takibi
- Ürün, KDV ve kritik stok yönetimi
- Stok açılışı ve stok değer takibi
- Alış ve satış faturaları
- Fatura önizleme ve sunucu taraflı tutar hesaplama
- Fatura onayında otomatik yevmiye ve stok hareketi
- Fatura PDF çıktısı
- Kasa ve banka hesapları
- Tahsilat ve ödeme dağıtımı
- Ödeme tersleme
- Kasa / banka virman işlemleri
- Mizan
- KDV özeti
- Gelir tablosu
- Bilanço
- Sistem mutabakatı
- Mali rapor PDF çıktıları
- Dönem kapanış ön kontrolü
- Tek işlemle kapanış ve sonraki döneme devir
- Stok, kasa/banka ve bilanço bakiyelerinin yeni döneme taşınması
- Admin / Accountant / Sales / Reader rol modeli
- Audit log ekranı
- Otomasyon / outbox görüntüleme
- Kritik işlemlerde SweetAlert2 onay akışları
- Ortak loading, error ve empty state bileşenleri
- Responsive sidebar tabanlı yönetim arayüzü

---

## Temel İş Akışı

```text
Kullanıcı
   │
   ▼
Şirket Seçimi
   │
   ▼
Mali Dönem Seçimi
   │
   ├── Hesap Planı
   ├── Cariler
   ├── Kasa / Banka
   ├── Ürün / Stok
   │
   ▼
Alış / Satış Faturası
   │
   ├── Taslak
   ├── Önizleme
   └── Onay
         │
         ├── Yevmiye Kaydı
         ├── Stok Hareketi
         └── Cari Bakiye
                │
                ▼
       Tahsilat / Ödeme
                │
                ▼
             Raporlar
                │
                ▼
          Mutabakat Kontrolü
                │
                ▼
          Dönem Kapanışı
                │
                ▼
        Sonraki Döneme Devir
```

---

## Kullanılan Teknolojiler

| Teknoloji | Kullanım |
|---|---|
| React 19 | UI ve component yapısı |
| React Router 8 | Route ve korumalı sayfa yönetimi |
| Vite 8 | Development server ve production build |
| Bootstrap 5.3 | Responsive arayüz |
| Bootstrap Icons | Arayüz ikonları |
| Axios | Merkezi API iletişimi |
| SweetAlert2 | Kritik işlem onayları ve geri bildirim |
| ECharts | Grafik tabanlı rapor görselleştirmeleri |
| ExcelJS | Excel çıktıları |
| pdfmake | Tarayıcı taraflı rapor çıktıları |
| ESLint | Kod kalite kontrolü |
| Node Test Runner | Frontend yardımcı fonksiyon testleri |

Backend tarafında **.NET 10, ASP.NET Core Web API, EF Core, SQLite, JWT, QuestPDF ve BackgroundService** kullanılmaktadır.

---

## Muhasebe Modülleri

### Şirket ve Mali Dönem

Kullanıcı erişebildiği şirketler arasında geçiş yapabilir. Her şirket kendi mali dönemlerine, muhasebe verilerine ve rol üyeliklerine sahiptir.

Dönemler:

- `Open` — yeni muhasebe hareketlerine açıktır.
- `Locked` — kapanmış dönemdir; yeni kayıt kabul etmez.

Aktif şirket ve aktif dönem uygulama context'i üzerinden bütün ilgili ekranlara aktarılır.

### Hesap Planı ve Yevmiye

Standart hesap planı tek işlemle oluşturulabilir.

Örnek hesaplar:

```text
100.01  Kasa
102.01  Banka
120.01  Alıcılar
153.01  Ticari Mallar
191.01  İndirilecek KDV
320.01  Satıcılar
391.01  Hesaplanan KDV
500.01  Sermaye
570.01  Geçmiş Yıl Sonucu
590.01  Dönem Sonucu
600.01  Satışlar
621.01  Satılan Mal Maliyeti
```

Yevmiye ekranı kayıt sırasında canlı olarak toplam borcu, toplam alacağı, farkı ve gerekli cari / kasa-banka boyutlarını kontrol eder. Dengesiz fiş kaydedilemez.

### Cari Hesaplar

Cari kartlar aşağıdaki türlerden biri olabilir:

- Müşteri
- Tedarikçi
- Müşteri / Tedarikçi

Cari ekranında listeleme, filtreleme, ekstre, bakiye, açık faturalar ve pasife alma işlemleri bulunur.

### Ürün ve Stok

Ürün kartında ürün kodu, ürün adı, birim, satış fiyatı, KDV oranı, kritik stok miktarı, tercih edilen tedarikçi, stok hesabı ve maliyet hesabı tanımlanır.

Stok miktarı ve stok değeri doğrudan hareketlerden hesaplanır; manuel bakiye tutulmaz.

### Fatura Yönetimi

Sistem iki fatura tipini destekler:

- Satış faturası
- Alış faturası

Akış:

```text
Taslak
  ↓
Önizleme
  ↓
Kaydet
  ↓
Onayla
  ↓
Yevmiye + Stok + Cari Etkisi
```

Taslak fatura muhasebe ve stok bakiyelerini etkilemez. Onaylanan satış faturası stok çıkışı ve satış maliyeti oluşturur. Onaylanan alış faturası stok girişi ve tedarikçi borcu oluşturur.

### Tahsilat ve Ödeme

Tahsilat / ödeme işlemleri açık faturalara dağıtılır.

- Tahsilat → müşteri satış faturaları
- Ödeme → tedarikçi alış faturaları

Fatura tamamen kapandığında durum `Paid`, kısmi ödeme durumunda `PartiallyPaid` olur. Fazla dağıtım ve avans ilk sürüm kapsamında desteklenmez.

### Kasa / Banka ve Virman

Kasa ve banka hesapları ilgili muhasebe hesaplarına bağlıdır.

```text
Kasa  → 100.*
Banka → 102.*
```

Bakiyeler muhasebe hareketlerinden oluşur.

Virman işlemi:

```text
Hedef Kasa/Banka   BORÇ
Kaynak Kasa/Banka  ALACAK
```

şeklinde dengeli fiş üretir ve gelir / gider oluşturmaz.

---

## Mali Raporlar

Uygulama aşağıdaki finansal raporları sunar:

- **Mizan:** hesap bazında borç, alacak ve bakiye kontrolü
- **KDV Özeti:** indirilecek KDV, hesaplanan KDV, net KDV ve mutabakat farkları
- **Gelir Tablosu:** gelirler, giderler ve dönem sonucu
- **Bilanço:** varlıklar, yükümlülükler, özkaynak ve bilanço farkı
- **Mutabakat:** fiş, stok, cari, kasa/banka ve KDV kontrolleri

Raporlar PDF olarak indirilebilir.

---

## Dönem Kapanışı ve Devir

Kapanış işleminden önce sistem bir **Closing Preview** oluşturur.

Kapanış şu durumlarda engellenebilir:

- Taslak belge bulunması
- Dengesiz muhasebe kayıtları
- Stok mutabakat farkı
- Cari mutabakat farkı
- Kasa / banka mutabakat farkı
- Eksik hesap eşlemesi
- Hedef dönemin uygun olmaması

Başarılı kapanışta gelir ve gider hesapları kapatılır, dönem sonucu hesaplanır, kaynak dönem kilitlenir, bilanço hesapları ve stok bakiyeleri hedef döneme taşınır.

Kritik kapanış işleminde kullanıcıdan dönem adını tekrar yazarak onay vermesi istenir.

---

## Rol ve Yetki Modeli

| İşlem | Admin | Accountant | Sales | Reader |
|---|:---:|:---:|:---:|:---:|
| Şirket / üye yönetimi | ✅ | ❌ | ❌ | ❌ |
| Hesap planı | ✅ | ✅ | ❌ | ❌ |
| Yevmiye | ✅ | ✅ | ❌ | ❌ |
| Müşteri oluşturma | ✅ | ✅ | ✅ | ❌ |
| Tedarikçi oluşturma | ✅ | ✅ | ❌ | ❌ |
| Satış faturası taslağı | ✅ | ✅ | ✅ | ❌ |
| Alış faturası | ✅ | ✅ | ❌ | ❌ |
| Fatura onayı | ✅ | ✅ | ❌ | ❌ |
| Tahsilat / ödeme | ✅ | ✅ | ❌ | ❌ |
| Mali raporlar | ✅ | ✅ | ❌ | ✅ |
| Audit log | ✅ | ✅ | ❌ | ❌ |
| Dönem kapanışı | ✅ | ✅ | ❌ | ❌ |

> Frontend rol kontrolleri kullanıcı deneyimi içindir. Asıl yetkilendirme backend API tarafından uygulanır.

---

## Doğrulanan Acceptance Akışları

Proje geliştirme sonunda aşağıdaki uçtan uca muhasebe senaryoları manuel olarak doğrulanmıştır.

### Satış ve Tahsilat

```text
Alış ile stok oluştur
      ↓
Satış faturası
      ↓
Fatura onayı
      ↓
Satış + maliyet yevmiyesi
      ↓
Stok çıkışı
      ↓
Banka tahsilatı
      ↓
Fatura Paid
      ↓
Müşteri bakiyesi 0
```

### Alış ve Ödeme

```text
Alış faturası
      ↓
Stok girişi
      ↓
Tedarikçi borcu
      ↓
Kasadan ödeme
      ↓
Fatura Paid
      ↓
Tedarikçi bakiyesi 0
```

### Dönem Kapanışı

```text
Mizan
  ↓
KDV Özeti
  ↓
Gelir Tablosu
  ↓
Bilanço
  ↓
Mutabakat
  ↓
Kapanış Ön Kontrolü
  ↓
Dönemi Kapat
  ↓
Sonraki Döneme Devret
  ↓
Kaynak Dönem Locked
```

Kontrol edilen temel sonuçlar:

- Mizan borç / alacak toplamları eşit
- KDV mutabakat farkları sıfır
- Bilanço farkı sıfır
- Cari bakiyeler fatura / ödeme hareketleriyle uyumlu
- Stok muhasebe değeri ile stok alt kayıtları uyumlu
- Kasa / banka alt kayıtları yevmiye ile uyumlu
- Yeni dönemde bilanço ve stok açılışları mevcut
- Gelir / gider hesapları yeni döneme faaliyet bakiyesi olarak taşınmıyor
- Kilitli dönemde yeni kayıt oluşturulamıyor

---

## Proje Yapısı

```text
src/
├── api/
│   └── client.js
├── components/
│   ├── ConfirmModal.jsx
│   ├── PageState.jsx
│   └── ProtectedRoute.jsx
├── context/
│   ├── AccountingContext.jsx
│   ├── AuthContext.jsx
│   ├── useAccounting.js
│   └── useAuth.js
├── layouts/
│   ├── LayoutPage.jsx
│   └── layout.css
├── pages/
│   ├── Accounts/
│   ├── Administration/
│   ├── Auth/
│   ├── Closing/
│   ├── Companies/
│   ├── Counterparties/
│   ├── Home/
│   ├── Inventory/
│   ├── Invoices/
│   ├── Journal/
│   ├── Payments/
│   ├── Periods/
│   ├── Products/
│   ├── Reports/
│   ├── Transfers/
│   └── Treasury/
└── utils/
    └── accounting.js
```

---

## Kurulum

### Gereksinimler

- Node.js 20+
- npm
- Çalışan FinansApi backend'i
- Backend için .NET 10 SDK

### Repository'yi klonlayın

```bash
git clone https://github.com/ismailbarankarasu/Finance-Front.git
cd Finance-Front
```

### Bağımlılıkları yükleyin

```bash
npm install
```

### Ortam dosyasını oluşturun

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Varsayılan API adresi:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Frontend'i çalıştırın

```bash
npm run dev
```

Varsayılan Vite adresi:

```text
http://localhost:5173
```

Backend repository:

https://github.com/ismailbarankarasu/FinansApi

---

## Kullanılabilir Komutlar

```bash
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

---

## API İletişimi

Bütün istekler:

```text
src/api/client.js
```

üzerinden gönderilir.

Frontend ile kullanılan OpenAPI sözleşmesinin kopyası:

```text
docs/api-v1.json
```

Backend'in interaktif Scalar arayüzü:

```text
http://localhost:5000/scalar/v1
```

---

## Kritik İş Kuralları

- Dengesiz yevmiye kaydı oluşturulamaz.
- Her yevmiye satırında yalnız borç veya alacak pozitif olabilir.
- Cari kontrol hesaplarında cari boyutu zorunludur.
- Kasa / banka hesaplarında treasury boyutu zorunludur.
- Taslak faturalar muhasebe ve stoku etkilemez.
- Negatif stok kabul edilmez.
- Fatura onayı atomik muhasebe / stok etkisi oluşturur.
- Tahsilat ve ödeme dağılım toplamı işlem toplamına eşit olmalıdır.
- Fazla tahsilat / ödeme dağıtımı kabul edilmez.
- Onaylı hareketler doğrudan silinmez; uygun yerlerde ters kayıt kullanılır.
- Kritik yazma işlemlerinde idempotency key kullanılır.
- Kilitli mali döneme yeni kayıt yapılamaz.
- Dönem kapanışı öncesinde mutabakat farkı bulunmamalıdır.
- Aynı dönem ikinci kez devredildiğinde yeni kapanış / açılış kayıtları üretilmemelidir.

---

## UX Kararları

Kritik işlemlerde tarayıcının native `confirm` / `prompt` pencereleri yerine **SweetAlert2** kullanılmaktadır.

Örnekler:

- Yevmiye onayı
- Yevmiye tersleme
- Fatura onayı
- Ödeme tersleme
- Cari kartı pasif yapma
- Şirket üyesini çıkarma
- Dönem kapanışı

Tekrar eden ekran durumları ortak componentlerle yönetilir:

```text
PageLoading
PageError
EmptyState
```

---

## Güvenlik Notları

- JWT veya SMTP gibi gizli değerler frontend kaynak koduna yazılmamalıdır.
- Frontend rol kontrolü gerçek bir güvenlik sınırı değildir.
- Bütün şirket / dönem / rol yetkileri API tarafından tekrar doğrulanmalıdır.
- API URL'si `.env.local` üzerinden yapılandırılmalıdır.
- Production ortamında HTTPS kullanılmalıdır.

---

## Case Kapsamı

Bu çalışma aşağıdaki ana modülleri kapsamaktadır:

- Şirket ve mali dönem
- Hesap planı ve yevmiye
- Cari hesap
- Ürün ve stok
- Alış / satış faturaları
- Tahsilat ve ödeme
- Kasa / banka
- Virman
- Mali raporlar
- Mutabakat
- Rol ve yetkilendirme
- Audit log
- Otomasyon / outbox
- Dönem kapanışı ve devir

Projenin temel amacı yalnızca ekran üretmek değil; **çift taraflı muhasebe, belge yaşam döngüsü, stok-muhasebe uyumu, cari mutabakatı ve dönem kapanışı gibi iş kurallarını doğru veri akışıyla uygulamaktır.**

---

## Repository'ler

**Frontend**  
https://github.com/ismailbarankarasu/Finance-Front

**Backend**  
https://github.com/ismailbarankarasu/FinansApi
