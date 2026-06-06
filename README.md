<div align="center">
  <img src="Cloudblocklogo.png" alt="Cloud Block Logo" width="180" />

  # Cloud Block
  
  **Scratch için Geliştirilmiş, Yeni Nesil Gerçek Zamanlı İşbirliği Eklentisi**

  <p>
    <img src="https://img.shields.io/badge/Manifest_V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 18" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
    <img src="https://img.shields.io/badge/Scratch_Uyumlu-4D97FF?style=for-the-badge&logo=scratch&logoColor=white" alt="Scratch" />
  </p>
</div>

<br>

Eski, sürekli çöken ve arayüzü kafa karıştıran eklentileri unutun. **Cloud Block**, <a href="https://scratch.mit.edu">Scratch.mit.edu</a> üzerinde takım çalışması yapmayı adeta profesyonel bir yazılım ofisindeymişsiniz gibi akıcı, şık ve sorunsuz hale getirmek için sıfırdan tasarlandı.

## <img src="https://icongr.am/feather/zap.svg?size=28&color=eab308" width="24" height="24" style="vertical-align: middle;" alt="Icon" /> Neden Cloud Block? Neyi Farklı Yaptık?

Piyasadaki diğer eklentilerin en büyük sorunu **sunucu optimizasyonu** ve **arayüz** tarafında sınıfta kalmalarıydı. Biz mimariyi baştan aşağı değiştirdik.

* <img src="https://icongr.am/feather/layers.svg?size=20&color=6366f1" width="18" height="18" style="vertical-align: middle;" alt="Icon" /> **Glassmorphism Arayüz:** Keskin köşeler yok. Tamamen "hap" formunda yuvarlatılmış hatlar, buzlu cam efektleri ve minimalist bir menü. Scratch'in içine sonradan yamalanmış gibi değil, orijinal ve premium bir parça gibi hissettirir.
* <img src="https://icongr.am/feather/mouse-pointer.svg?size=20&color=ec4899" width="18" height="18" style="vertical-align: middle;" alt="Icon" /> **Figma Tarzı Pürüzsüz İmleçler:** Arkadaşınızın faresi ekranda ışınlanmaz. Özel CSS donanım ivmelendirmesi sayesinde 60+ FPS ile yağ gibi akar. Herkesin kendine has bir rengi ve yuvarlak isim etiketi vardır.
* <img src="https://icongr.am/feather/server.svg?size=20&color=22c55e" width="18" height="18" style="vertical-align: middle;" alt="Icon" /> **Kusursuz Sunucu Optimizasyonu (Sıfır Çökme):** Fareyi her oynattığınızda sunucuya yüzlerce veri gitmez. Cloud Block, özel bir **Geçici Bellek (Batched Cursor Cache)** mimarisi kullanır. Veriler sunucuda toplanıp saniyede 20 kez toplu paketler halinde dağıtılır. Aynı projeye 100 kişi girse bile sunucu yorulmaz, internetiniz sömürülmez.
* <img src="https://icongr.am/feather/shield.svg?size=20&color=3b82f6" width="18" height="18" style="vertical-align: middle;" alt="Icon" /> **Çakışma Koruması (CRDT):** İki kişi aynı anda aynı koda mı dokundu? Bloklarınız birbirine girmeyecek. Akıllı eşitleme motorumuz olayları milisaniyeler içinde sıraya koyar.
* <img src="https://icongr.am/feather/clock.svg?size=20&color=f97316" width="18" height="18" style="vertical-align: middle;" alt="Icon" /> **Zaman Makinesi:** "Biri yanlışlıkla tüm kodları sildi!" derdi bitti. Projenizin tüm büyük değişimleri bulutta güvende. Menüdeki tek bir tuşla dakikalar öncesine geri dönebilirsiniz.

<br>

## <img src="https://icongr.am/feather/download-cloud.svg?size=28&color=06b6d4" width="24" height="24" style="vertical-align: middle;" alt="Icon" /> Nasıl Kurulur? (Kolay Kurulum)

Eklentiyi bilgisayarınıza kurmak ve çalıştırmak son derece basittir:

1. **Projeyi indirin (Klonlayın):**
   Boş bir klasör açın, terminalde aşağıdaki komutu çalıştırarak projeyi klonlayın:
   ```bash
   git clone https://github.com/theayzek01/CloudBlock.git
   ```

2. **Kurulumu Başlatın:**
   Klonladığınız klasörün içinde bulunan **`setup.bat`** dosyasına çift tıklayarak çalıştırın.
   *Bu işlem gerekli tüm paketleri otomatik olarak yükleyecek ve tarayıcı eklentisini derleyecektir.*

3. **Klasör Yolunu Kopyalayın:**
   Derleme işlemi bittiğinde terminalin en sonunda size kopyalamanız için bir klasör yolu (Örn: `C:\...\CloudBlock\extension\dist`) gösterecektir. Bu yolu kopyalayın.

4. **Tarayıcıya Yükleyin:**
   - Google Chrome'da `chrome://extensions/` adresine gidin.
   - Sağ üst köşeden **Geliştirici modunu (Developer Mode)** aktif edin.
   - Sol üstteki **Paketlenmemiş öğe yükle (Load unpacked)** butonuna tıklayın.
   - Kopyaladığınız klasör yolunu buraya yapıştırıp onaylayın.

Hepsi bu kadar! Artık Scratch'e girdiğinizde sol üstte şık Cloud Block panelini göreceksiniz.

<br>

## <img src="https://icongr.am/feather/cpu.svg?size=28&color=8b5cf6" width="24" height="24" style="vertical-align: middle;" alt="Icon" /> Mimari Yapı

**Frontend (İstemci):** React.js ve Vite üzerine kurulu. State yönetimi için hafifliğiyle bilinen `Zustand` kullanıldı. Blockly motoruna doğrudan müdahale etmek yerine olayları dışarıdan okuyan bir "Interceptor" mantığıyla çalışır. <br>
**Backend (Sunucu):** Node.js ve Socket.io gücüyle yazıldı. Odak noktası "Spam Engelleme" (Throttling/Batching) olduğu için bellek yönetimi son derece düşüktür.

---
*Not: Bu proje bağımsız olarak geliştirilmiştir ve Scratch Vakfı (Scratch Foundation) ile herhangi bir resmi bağı bulunmamaktadır.*
