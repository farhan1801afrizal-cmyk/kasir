/* =======================
   HELPER
======================= */
const el = id => document.getElementById(id);
const rupiah = n => Number(n || 0).toLocaleString("id-ID");

function showToast(msg, type = "success") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

/* =======================
   STORAGE
======================= */
let barang = JSON.parse(localStorage.getItem("barang")) || [];
let kasir = JSON.parse(localStorage.getItem("kasir")) || [];
let riwayat = JSON.parse(localStorage.getItem("riwayat")) || [];

/* =======================
   ELEMENT
======================= */
const tabelBarang = el("tabelBarang");
const tabelKasir = el("tabelKasir");
const pilihBarang = el("pilihBarang");
const hargaKasir = el("hargaKasir");
const qtyKasir = el("qtyKasir");
const totalKasir = el("totalKasir");
const uangBayar = el("uangBayar");
const diskon = el("diskon");
const kembalian = el("kembalian");
const dTransaksi = el("dTransaksi");
const dPendapatan = el("dPendapatan");

/* =======================
   BARANG
======================= */
function renderBarang() {
    tabelBarang.innerHTML = "";
    pilihBarang.innerHTML = `<option value="">Pilih Barang</option>`;

    barang.forEach((b, i) => {
        const status =
            b.stok === 0 ? "danger" :
            b.stok <= 5 ? "warning" : "success";

        tabelBarang.innerHTML += `
        <tr>
            <td>${i + 1}</td>
            <td>${b.nama}</td>
            <td>Rp ${rupiah(b.harga)}</td>
            <td>${b.stok}</td>
            <td><span class="badge ${status}">
                ${status === "danger" ? "Habis" :
                  status === "warning" ? "Menipis" : "Tersedia"}
            </span></td>
            <td>
                <button onclick="hapusBarang(${i})">Hapus</button>
            </td>
        </tr>`;

        if (b.stok > 0) {
            pilihBarang.innerHTML += `<option value="${i}">${b.nama}</option>`;
        }
    });

    localStorage.setItem("barang", JSON.stringify(barang));
}

function tambahBarang() {
    const nama = el("namaBarang").value.trim();
    const harga = +el("hargaBarang").value;
    const stok = +el("stokBarang").value;

    if (!nama || harga <= 0 || stok < 0)
        return showToast("Data barang tidak valid", "error");

    barang.push({ nama, harga, stok });
    el("namaBarang").value = "";
    el("hargaBarang").value = "";
    el("stokBarang").value = "";

    renderBarang();
    showToast("Barang ditambahkan");
}

function hapusBarang(i) {
    barang.splice(i, 1);
    renderBarang();
}

/* =======================
   KASIR
======================= */
pilihBarang.onchange = () => {
    if (pilihBarang.value !== "") {
        hargaKasir.value = barang[pilihBarang.value].harga;
    } else {
        hargaKasir.value = "";
    }
};

function renderKasir() {
    tabelKasir.innerHTML = "";
    let total = 0;

    kasir.forEach((k, i) => {
        total += k.subtotal;
        tabelKasir.innerHTML += `
        <tr>
            <td>${i + 1}</td>
            <td>${k.nama}</td>
            <td>Rp ${rupiah(k.harga)}</td>
            <td>${k.qty}</td>
            <td>Rp ${rupiah(k.subtotal)}</td>
            <td>
                <button onclick="hapusKasir(${i})">X</button>
            </td>
        </tr>`;
    });

    totalKasir.innerText = rupiah(total);
    hitungKembalian();
    localStorage.setItem("kasir", JSON.stringify(kasir));
}

function tambahKasir() {
    const i = pilihBarang.value;
    const qty = +qtyKasir.value;

    if (i === "" || qty <= 0)
        return showToast("Input kasir tidak valid", "error");

    if (qty > barang[i].stok)
        return showToast("Stok tidak cukup", "error");

    barang[i].stok -= qty;

    kasir.push({
        nama: barang[i].nama,
        harga: barang[i].harga,
        qty,
        subtotal: barang[i].harga * qty
    });

    qtyKasir.value = "";
    renderBarang();
    renderKasir();
}

function hapusKasir(i) {
    const k = kasir[i];
    const b = barang.find(x => x.nama === k.nama);
    if (b) b.stok += k.qty;

    kasir.splice(i, 1);
    renderBarang();
    renderKasir();
}

/* =======================
   PEMBAYARAN
======================= */
function hitungKembalian() {
    const total = kasir.reduce((a, b) => a + b.subtotal, 0);
    const d = +diskon.value || 0;
    const bayar = +uangBayar.value || 0;
    const akhir = total - (total * d / 100);

    kembalian.value = bayar >= akhir ? rupiah(bayar - akhir) : 0;
}

/* =======================
   TRANSAKSI
======================= */
function selesaiTransaksi() {
    if (!kasir.length)
        return showToast("Kasir kosong", "error");

    const total = kasir.reduce((a, b) => a + b.subtotal, 0);
    const d = +diskon.value || 0;
    const bayar = +uangBayar.value || 0;
    const akhir = total - (total * d / 100);

    if (bayar < akhir)
        return showToast("Uang kurang", "error");

    riwayat.push({
        tanggal: new Date().toISOString(),
        total: akhir,
        bayar,
        kembali: bayar - akhir,
        diskon: d,
        item: JSON.parse(JSON.stringify(kasir))
    });

    kasir = [];
    localStorage.removeItem("kasir");
    localStorage.setItem("riwayat", JSON.stringify(riwayat));

    renderKasir();
    updateDashboard();
    cetakStruk();
    showToast("Transaksi selesai");
}

/* =======================
   DASHBOARD
======================= */
function updateDashboard() {
    dTransaksi.innerText = riwayat.length;
    dPendapatan.innerText = rupiah(
        riwayat.reduce((a, b) => a + b.total, 0)
    );
}

/* =======================
   STRUK
======================= */
const defaultStruk = {
    nama: "TOKO ANDA",
    alamat: "",
    footer: "Terima Kasih",
    showDiskon: true
};

function loadStruk() {
    return JSON.parse(localStorage.getItem("struk")) || defaultStruk;
}

function simpanStruk() {
    const data = {
        nama: el("strukNama").value || defaultStruk.nama,
        alamat: el("strukAlamat").value || "",
        footer: el("strukFooter").value || defaultStruk.footer,
        showDiskon: el("strukShowDiskon").checked
    };
    localStorage.setItem("struk", JSON.stringify(data));
    showToast("Struk disimpan");
}

function cetakStruk() {
    const r = riwayat.at(-1);
    if (!r) return;

    const s = loadStruk();
    const w = window.open("", "", "width=280");

    w.document.write(`
    <body style="font-family:monospace;font-size:12px">
    <center>
        <b>${s.nama}</b><br>${s.alamat}
    </center>
    <hr>
    ${r.item.map(i =>
        `${i.nama}<br>${i.qty} x ${rupiah(i.harga)} = ${rupiah(i.qty * i.harga)}`
    ).join("<br>")}
    <hr>
    Total : ${rupiah(r.total)}<br>
    ${s.showDiskon ? `Diskon : ${r.diskon}%<br>` : ""}
    Bayar : ${rupiah(r.bayar)}<br>
    Kembali : ${rupiah(r.kembali)}
    <hr>
    <center>${s.footer}</center>
    <script>window.print()</script>
    </body>
    `);
}

/* =======================
   DARK MODE
======================= */
function toggleDarkMode() {
    document.body.classList.toggle("dark");
    localStorage.setItem("dark", document.body.classList.contains("dark"));
}

if (localStorage.getItem("dark") === "true") {
    document.body.classList.add("dark");
}

/* =======================
   JAM
======================= */
setInterval(() => {
    el("jamRealtime").innerText = new Date().toLocaleString("id-ID");
}, 1000);

/* =======================
   INIT
======================= */
document.addEventListener("DOMContentLoaded", () => {
    renderBarang();
    renderKasir();
    updateDashboard();
});
function renderRiwayat() {
    const tbody = document.getElementById("tabelRiwayat");
    if (!tbody) return;

    tbody.innerHTML = "";

    riwayat.forEach((r, i) => {
        tbody.innerHTML += `
        <tr>
            <td>${i + 1}</td>
            <td>${new Date(r.tanggal).toLocaleString("id-ID")}</td>
            <td>Rp ${rupiah(r.total)}</td>
        </tr>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderBarang();
    renderKasir();
    updateDashboard();
    renderRiwayat();
});

function escpos(text) {
    return new TextEncoder().encode(text);
}
let btDevice = null;
let btCharacteristic = null;

async function printBluetooth() {
    try {
        const r = riwayat.at(-1);
        if (!r) return showToast("Tidak ada transaksi", "error");

        // connect
        if (!btDevice) {
            btDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [0xFFE0, 0x18F0]
            });

            const server = await btDevice.gatt.connect();
            const services = await server.getPrimaryServices();

            for (const service of services) {
                const chars = await service.getCharacteristics();
                if (chars.length) {
                    btCharacteristic = chars[0];
                    break;
                }
            }
        }

        if (!btCharacteristic)
            return showToast("Printer tidak ditemukan", "error");

        const s = loadStruk();

        let text = "";
        text += "\x1B\x40"; // init
        text += "\x1B\x61\x01"; // center
        text += s.nama + "\n";
        text += s.alamat + "\n";
        text += "------------------------\n";
        text += "\x1B\x61\x00"; // left

        r.item.forEach(i => {
            text += `${i.nama}\n`;
            text += `${i.qty} x ${rupiah(i.harga)} = ${rupiah(i.subtotal)}\n`;
        });

        text += "------------------------\n";
        text += `TOTAL   : ${rupiah(r.total)}\n`;
        if (s.showDiskon)
            text += `DISKON  : ${r.diskon}%\n`;
        text += `BAYAR   : ${rupiah(r.bayar)}\n`;
        text += `KEMBALI : ${rupiah(r.kembali)}\n\n`;

        text += "\x1B\x61\x01";
        text += s.footer + "\n\n\n";
        text += "\x1D\x56\x41"; // cut

        await btCharacteristic.writeValue(escpos(text));

        showToast("Struk tercetak");
    } catch (e) {
        console.error(e);
        showToast("Gagal print bluetooth", "error");
    }
}
