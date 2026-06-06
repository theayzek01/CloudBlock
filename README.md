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

## <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/bolt.svg" width="20" height="20" alt="Icon" /> Neden Cloud Block? Neyi Farklı Yaptık?

Piyasadaki diğer eklentilerin en büyük sorunu **sunucu optimizasyonu** ve **arayüz** tarafında sınıfta kalmalarıydı. Biz mimariyi baştan aşağı değiştirdik.

* <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/layer-group.svg" width="16" height="16" alt="Icon" /> **Glassmorphism Arayüz:** Keskin köşeler yok. Tamamen "hap" formunda yuvarlatılmış hatlar, buzlu cam efektleri ve minimalist bir menü. Scratch'in içine sonradan yamalanmış gibi değil, orijinal ve premium bir parça gibi hissettirir.
* <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/arrow-pointer.svg" width="16" height="16" alt="Icon" /> **Figma Tarzı Pürüzsüz İmleçler:** Arkadaşınızın faresi ekranda ışınlanmaz. Özel CSS donanım ivmelendirmesi sayesinde 60+ FPS ile yağ gibi akar. Herkesin kendine has bir rengi ve yuvarlak isim etiketi vardır.
* <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/server.svg" width="16" height="16" alt="Icon" /> **Kusursuz Sunucu Optimizasyonu (Sıfır Çökme):** Fareyi her oynattığınızda sunucuya yüzlerce veri gitmez. Cloud Block, özel bir **Geçici Bellek (Batched Cursor Cache)** mimarisi kullanır. Veriler sunucuda toplanıp saniyede 20 kez toplu paketler halinde dağıtılır. Aynı projeye 100 kişi girse bile sunucu yorulmaz, internetiniz sömürülmez.
* <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/shield-halved.svg" width="16" height="16" alt="Icon" /> **Çakışma Koruması (CRDT):** İki kişi aynı anda aynı koda mı dokundu? Bloklarınız birbirine girmeyecek. Akıllı eşitleme motorumuz olayları milisaniyeler içinde sıraya koyar.
* <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/clock-rotate-left.svg" width="16" height="16" alt="Icon" /> **Zaman Makinesi:** "Biri yanlışlıkla tüm kodları sildi!" derdi bitti. Projenizin tüm büyük değişimleri bulutta güvende. Menüdeki tek bir tuşla dakikalar öncesine geri dönebilirsiniz.

<br>

## <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/screwdriver-wrench.svg" width="20" height="20" alt="Icon" /> Nasıl Kurulur? (Geliştirici Sürümü)

Projeyi kendi bilgisayarınızda derleyip hemen denemek için adımları takip edin:

### 1. Backend (Sunucu) Kurulumu
Gerçek zamanlı eşitlemenin kalbi olan sunucuyu başlatıyoruz:
```bash
cd server
npm install
node index.js
```
> Sunucu varsayılan olarak `http://localhost:3001` portunda çalışmaya başlar.

### 2. Chrome Eklentisini Paketleme
React ve Vite ile yazdığımız modern eklentimizi tarayıcının anlayacağı dile çeviriyoruz:
```bash
cd extension
npm install
npm run build
```

**Tarayıcıya Ekleme:**
1. Chrome'da `chrome://extensions/` adresine gidin.
2. Sağ üstten **Geliştirici modunu** aktif edin.
3. Sol üstteki **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
4. Projenin içindeki `extension/dist` klasörünü seçin.

Hepsi bu kadar! Artık Scratch'e girdiğinizde sol üstte şık Cloud Block butonunu göreceksiniz.

<br>

## <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/sitemap.svg" width="20" height="20" alt="Icon" /> Mimari Yapı

**Frontend (İstemci):** React.js ve Vite üzerine kurulu. State yönetimi için hafifliğiyle bilinen `Zustand` kullanıldı. Blockly motoruna doğrudan müdahale etmek yerine olayları dışarıdan okuyan bir "Interceptor" mantığıyla çalışır. <br>
**Backend (Sunucu):** Node.js ve Socket.io gücüyle yazıldı. Odak noktası "Spam Engelleme" (Throttling/Batching) olduğu için bellek yönetimi son derece düşüktür.

---
*Not: Bu proje bağımsız olarak geliştirilmiştir ve Scratch Vakfı (Scratch Foundation) ile herhangi bir resmi bağı bulunmamaktadır.*
