# Finans Takip

React, Vite, React Router, Bootstrap ve Axios ile gelir/gider takibi.
Mevcut kategori ve işlem modal akışları korunur. Geliştirme kuralları: [AGENTS.md](AGENTS.md).
API sözleşmesi: [docs/api-v1.json](docs/api-v1.json).

## Çalıştırma

```sh
npm install
npm run dev
```

API varsayılan olarak `http://localhost:5000/api` adresindedir. Farklı adres için
`.env.example` dosyasını `.env.local` olarak kopyalayıp `VITE_API_BASE_URL` değerini değiştirin.
API'nin geliştirme sunucusunun origin adresine CORS izni vermesi gerekir.

## Sayfalar

- `/login`, `/register`: JWT ile giriş, API sınırlarına uygun kayıt formu.
- `/`: Tüm zamanların gelir/gider/bakiye özeti ve son 5 işlem.
- `/categories`: Gelir/gider kategorilerini listeleme, ekleme, güncelleme ve silme.
- `/transactions`: İşlem CRUD, tür/kategori/tarih/metin filtreleri ve sunucu sayfalaması.
- `/reports`: Apache ECharts ile aylık gelir/gider sütunları, bakiye çizgisi ve kategori dağılımı; erişilebilir veri tabloları.

Oturum açıldıktan veya sayfa yenilendikten sonra `/auth/me` ile kullanıcı bilgileri güncellenir.
Yetkisiz API yanıtında oturum temizlenir. Bağlantı hatalarında tekrar deneme sunulur.

## Raporlar ve indirme

Filtreleri değiştirdikten sonra **Uygula** düğmesine basın. Dosyalar ekranda gösterilen,
başarıyla yüklenmiş veriyi kullanır; uygulanmamış form değişiklikleri dışa aktarımı etkilemez.

| Bölüm | API | Kapsam |
| --- | --- | --- |
| Özet | `/reports/summary` | `from`, `to`; her iki işlem türü |
| Kategoriler | `/reports/by-category` | `from`, `to`, isteğe bağlı `type` |
| Aylık karşılaştırma | `/reports/monthly` | `year`; tüm yıl, her iki işlem türü |
| Ana sayfa son işlemler | `/reports/recent` | `take=5`; tüm zamanlar |

Aylık rapor yılı tarih aralığından bağımsızdır. Varsayılan kapsam geçerli takvim yılıdır.
Tarih aralığı boş bırakılırsa özet ve kategori verilerinde sınır uygulanmaz.
Günler kullanıcının yerel saat diliminde başlar/biter ve API'ye UTC RFC 3339 olarak gönderilir.
API'de eksik dönen aylar sıfırla tamamlanır. API sözleşmesi para birimi belirtmediği için tutarlara para birimi simgesi eklenmez.

- **CSV:** UTF-8 BOM, noktalı virgül ayırıcı, Türkçe ondalık virgülü. Excel'de açılabilir.
  Her satır bir özet/kategori/ay kaydıdır. Metinler formül olarak çalıştırılmaz.
- **Excel (.xlsx):** Özet, kategori ve aylık rapor için ayrı sayfalar; sayısal tutarlar,
  sabit başlık satırları ve filtreler.
- **PDF:** Türkçe karakterleri destekleyen gömülü Roboto fontu, grafikler, tablolar,
  yinelenen tablo başlıkları ve sayfa numaraları. Kategori sayısı arttıkça otomatik sayfalanır.

İndirmeler tarayıcıda hazırlanır; sunucuda ek export ucu gerekmez.
Excel/PDF kütüphaneleri yalnızca ilgili indirme seçildiğinde, ECharts ise rapor sayfasında yüklenir.
Bu özellik dosyadan veri içeri aktarma yapmaz.

## Kontroller

```sh
npm run lint
npm test
npm run build
```

Testler sayısal API metinlerini, eksik ayları, yerel gün sınırlarını, rapor kapsamlarını,
CSV kaçışlarını, Excel dosyasını tekrar okumayı ve PDF üretimini kapsar.
Örnek veriler yalnızca testlerde kullanılır; uygulama gerçek API verisini gösterir.

Derleme büyük grafik/dosya kütüphaneleri için parça boyutu uyarısı verebilir; bunlar ayrı ve
isteğe bağlı yüklenen parçalardır. ExcelJS'in uuid bağımlılığı npm audit'te iki orta seviye
bulgu olarak raporlanır (aynı bağımlılık zinciri). Uygulama dosya okumaz veya UUID buffer API'lerini çağırmaz;
ExcelJS güncellemelerinde bu bağımlılık yeniden kontrol edilmelidir.

## Kaynaklar

- [Apache ECharts modüler kullanım](https://echarts.apache.org/handbook/en/basics/import/)
- [ECharts boyut ve yaşam döngüsü](https://echarts.apache.org/handbook/en/concepts/chart-size/)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [pdfmake tarayıcı kullanımı](https://pdfmake.github.io/docs/0.3/getting-started/client-side/)
