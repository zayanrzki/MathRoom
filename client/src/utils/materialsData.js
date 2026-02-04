export const materialsData = {
    "Operasi Bilangan Real": {
        fundamental: {
            title: "Sifat Dasar Bilangan",
            explanation: "Memahami urutan operasi (KABATAKU) dan sifat dasar angka.",
            generalForm: "a + b = b + a",
            formula: "n x (a + b) = (n x a) + (n x b)"
        },
        menengah: {
            title: "Pecahan & Perpangkatan",
            explanation: "Operasi hitung pada bilangan berpangkat dan akar.",
            generalForm: "a^n x a/b",
            formula: "a^m x a^n = a^(m+n)"
        },
        pematangan: {
            title: "Aplikasi Logaritma Dasar",
            explanation: "Penyelesaian masalah eksponen yang lebih kompleks.",
            generalForm: "^a log b = c",
            formula: "a^c = b"
        }
    },
    "Persamaan Kuadrat": {
        fundamental: {
            title: "Bentuk Umum Kuadrat",
            explanation: "Mengenali variabel dan koefisien fungsi kuadrat.",
            generalForm: "ax² + bx + c = 0",
            formula: "D = b² - 4ac"
        },
        menengah: {
            title: "Metode Akar-akar",
            explanation: "Mencari solusi menggunakan rumus ABC atau pemfaktoran.",
            generalForm: "x1,2 = [-b ± √D] / 2a",
            formula: "x1 + x2 = -b/a, x1 . x2 = c/a"
        },
        pematangan: {
            title: "Grafik & Optimasi",
            explanation: "Menemukan titik puncak dan sumbu simetri.",
            generalForm: "y = ax² + bx + c",
            formula: "Xp = -b/2a, Yp = -D/4a"
        }
    },
    "SPLDV": {
        fundamental: {
            title: "Konsep Linear Dua Variabel",
            explanation: "Mengenal persamaan garis lurus dengan dua variabel.",
            generalForm: "ax + by = c",
            formula: "y = mx + c"
        },
        menengah: {
            title: "Eliminasi & Substitusi",
            explanation: "Teknik mencari nilai x dan y dalam sistem linear.",
            generalForm: "{ ax + by = c, dx + ey = f }",
            formula: "Eliminasi variabel untuk mencari variabel lainnya."
        },
        pematangan: {
            title: "Aplikasi Masalah Cerita",
            explanation: "Memodelkan harga barang atau umur ke dalam sistem linear.",
            generalForm: "Total Harga = (n1 . P1) + (n2 . P2)",
            formula: "Metode Determinan (Cramer)"
        }
    },
    "SPLTV": {
        fundamental: {
            title: "Persamaan Linear Tiga Variabel",
            explanation: "Mengenal bentuk tiga variabel (x, y, z) dalam satu sistem.",
            generalForm: "ax + by + cz = d",
            formula: "Bidang dalam koordinat 3D"
        },
        menengah: {
            title: "Metode Bertahap",
            explanation: "Eeliminasi satu variabel untuk mengubah sistem menjadi SPLDV.",
            generalForm: "3 Persamaan -> 2 Persamaan",
            formula: "Metode Substitusi Murni"
        },
        pematangan: {
            title: "Matriks & Determinan",
            explanation: "Menyelesaikan SPLTV secara cepat menggunakan aturan Cramer.",
            generalForm: "Dx, Dy, Dz / D",
            formula: "Aturan Sarrus"
        }
    },
    "Barisan dan Deret": {
        fundamental: {
            title: "Pola Bilangan",
            explanation: "Mengenali selisih (beda) atau rasio antar suku.",
            generalForm: "U1, U2, U3, ...",
            formula: "b = Un - U(n-1)"
        },
        menengah: {
            title: "Aritmetika & Geometri",
            explanation: "Menentukan suku ke-n dan jumlah suku pertama.",
            generalForm: "Un = a + (n-1)b",
            formula: "Sn = n/2 (a + Un)"
        },
        pematangan: {
            title: "Deret Tak Hingga",
            explanation: "Menghitung total deret geometri yang terus mengecil.",
            generalForm: "S∞ = a / (1 - r)",
            formula: "Syarat: -1 < r < 1"
        }
    },
    "Trigonometri": {
        fundamental: {
            title: "Perbandingan Siku-siku",
            explanation: "Konsep Sinus, Cosinus, dan Tangen pada segitiga.",
            generalForm: "Sisi Depan, Samping, Miring",
            formula: "Sin = De/Mi, Cos = Sa/Mi, Tan = De/Sa"
        },
        menengah: {
            title: "Sudut Istimewa",
            explanation: "Nilai trigonometri pada sudut 0, 30, 45, 60, dan 90 derajat.",
            generalForm: "Kuadran I - IV",
            formula: "Sin²x + Cos²x = 1"
        },
        pematangan: {
            title: "Aturan Sinus & Cosinus",
            explanation: "Menyelesaikan segitiga sembarang (bukan siku-siku).",
            generalForm: "a/sinA = b/sinB = c/sinC",
            formula: "a² = b² + c² - 2bc.cosA"
        }
    },
    "Matriks": {
        fundamental: {
            title: "Ordo & Elemen",
            explanation: "Mengenal baris dan kolom pada susunan angka.",
            generalForm: "A = [a b; c d]",
            formula: "Baris x Kolom"
        },
        menengah: {
            title: "Operasi Matriks",
            explanation: "Penjumlahan, pengurangan, dan perkalian dua matriks.",
            generalForm: "A . B ≠ B . A",
            formula: "Determinan |A| = ad - bc"
        },
        pematangan: {
            title: "Invers Matriks",
            explanation: "Mencari kebalikan matriks untuk menyelesaikan sistem.",
            generalForm: "A^-1 = 1/|A| . Adj(A)",
            formula: "X = A^-1 . B"
        }
    },
    "Fungsi Invers": {
        fundamental: {
            title: "Konsep Pemetaan",
            explanation: "Memahami hubungan domain, kodomain, dan range.",
            generalForm: "f(x) = y",
            formula: "Input -> Proses -> Output"
        },
        menengah: {
            title: "Kebalikan Fungsi",
            explanation: "Menentukan fungsi balik (f^-1) dari fungsi asal.",
            generalForm: "f^-1(y) = x",
            formula: "y = ax + b => x = (y-b)/a"
        },
        pematangan: {
            title: "Invers Fungsi Pecahan",
            explanation: "Trik cepat mencari invers fungsi rasional.",
            generalForm: "f(x) = (ax+b)/(cx+d)",
            formula: "f^-1(x) = (-dx+b)/(cx-a)"
        }
    },
    "Komposisi Fungsi": {
        fundamental: {
            title: "Penggabungan Fungsi",
            explanation: "Memasukkan hasil fungsi satu ke dalam fungsi lainnya.",
            generalForm: "(f o g)(x)",
            formula: "f(g(x))"
        },
        menengah: {
            title: "Operasi Terurut",
            explanation: "Menyelesaikan komposisi dua atau tiga fungsi.",
            generalForm: "f(g(h(x)))",
            formula: "Mengerjakan dari fungsi terdalam (paling kanan)."
        },
        pematangan: {
            title: "Mencari Fungsi Asal",
            explanation: "Menentukan g(x) jika (f o g)(x) dan f(x) diketahui.",
            generalForm: "(f o g)(x) = h(x)",
            formula: "Substitusi fungsi yang diketahui."
        }
    },
    "Persamaan Lingkaran": {
        fundamental: {
            title: "Lingkaran Pusat (0,0)",
            explanation: "Bentuk paling dasar dengan jari-jari r.",
            generalForm: "x² + y² = r²",
            formula: "Jarak titik ke titik"
        },
        menengah: {
            title: "Pusat Titik (a,b)",
            explanation: "Persamaan lingkaran yang bergeser dari pusat koordinat.",
            generalForm: "(x-a)² + (y-b)² = r²",
            formula: "Bentuk Umum: x²+y²+Ax+By+C=0"
        },
        pematangan: {
            title: "Garis Singgung",
            explanation: "Menentukan garis yang menyentuh tepat satu titik pada lingkaran.",
            generalForm: "y - b = m(x - a) ± r√(m²+1)",
            formula: "Syarat: D = 0"
        }
    },
    "Peluang": {
        fundamental: {
            title: "Titik & Ruang Sampel",
            explanation: "Menghitung semua kemungkinan kejadian yang bisa terjadi.",
            generalForm: "n(S)",
            formula: "P(A) = n(A) / n(S)"
        },
        menengah: {
            title: "Faktorial & Kombinasi",
            explanation: "Teknik menghitung susunan objek tanpa urutan.",
            generalForm: "nCr = n! / (r!(n-r)!)",
            formula: "Permutasi nPr = n! / (n-r)!"
        },
        pematangan: {
            title: "Kejadian Saling Lepas",
            explanation: "Peluang gabungan dua kejadian (A atau B).",
            generalForm: "P(A U B) = P(A) + P(B) - P(A ∩ B)",
            formula: "Kejadian Bersyarat: P(A|B)"
        }
    },
    "Statistika": {
        fundamental: {
            title: "Ukuran Pemusatan",
            explanation: "Mencari nilai tengah dari kumpulan data.",
            generalForm: "Mean, Median, Modus",
            formula: "x̄ = Σx / n"
        },
        menengah: {
            title: "Data Berkelompok",
            explanation: "Menghitung statistik pada data dalam tabel frekuensi.",
            generalForm: "Mo = Tb + [d1/(d1+d2)] . p",
            formula: "Median = Tb + [ (n/2 - F)/f ] . p"
        },
        pematangan: {
            title: "Ukuran Penyebaran",
            explanation: "Melihat seberapa jauh data tersebar dari rata-rata.",
            generalForm: "Simpangan Baku (S)",
            formula: "Varian = S²"
        }
    },
    "Limit Fungsi": {
        fundamental: {
            title: "Konsep Mendekati",
            explanation: "Melihat nilai y saat x mendekati angka tertentu.",
            generalForm: "lim x→a f(x)",
            formula: "Metode Substitusi Langsung"
        },
        menengah: {
            title: "Bentuk Tak Tentu",
            explanation: "Menyelesaikan limit yang hasilnya 0/0 atau ∞/∞.",
            generalForm: "Faktorisasi / Kali Sekawan",
            formula: "Aturan L'Hopital (Turunan)"
        },
        pematangan: {
            title: "Limit Tak Hingga",
            explanation: "Mencari nilai limit saat variabel menuju sangat besar.",
            generalForm: "lim x→∞ (ax^n + ...)/(bx^m + ...)",
            formula: "Jika n=m, hasil = a/b"
        }
    },
    "Diferensial": {
        fundamental: {
            title: "Aturan Turunan",
            explanation: "Mempelajari laju perubahan sesaat suatu fungsi.",
            generalForm: "f'(x) = dy/dx",
            formula: "f(x) = ax^n => f'(x) = anx^(n-1)"
        },
        menengah: {
            title: "Aturan Rantai",
            explanation: "Cara menurunkan fungsi di dalam fungsi (komposisi).",
            generalForm: "y = (u)^n",
            formula: "y' = n(u)^(n-1) . u'"
        },
        pematangan: {
            title: "Aplikasi Ekstrim",
            explanation: "Menentukan nilai maksimum dan minimum fungsi.",
            generalForm: "Syarat Stasioner: f'(x) = 0",
            formula: "Titik Belok: f''(x) = 0"
        }
    },
    "Integral": {
        fundamental: {
            title: "Anti-Turunan",
            explanation: "Konsep membalikkan hasil turunan kembali ke fungsi asal.",
            generalForm: "∫ f(x) dx",
            formula: "∫ x^n dx = [1/(n+1)] x^(n+1) + C"
        },
        menengah: {
            title: "Integral Tentu",
            explanation: "Menghitung luas daerah di bawah kurva dengan batas a dan b.",
            generalForm: "∫ [a ke b] f(x) dx",
            formula: "F(b) - F(a)"
        },
        pematangan: {
            title: "Metode Substitusi & Parsial",
            explanation: "Teknik mengintegralkan fungsi perkalian yang rumit.",
            generalForm: "∫ u dv = uv - ∫ v du",
            formula: "∫ f(g(x)) g'(x) dx (Substitusi)"
        }
    }
};

export const getMaterialTopics = () => Object.keys(materialsData);
