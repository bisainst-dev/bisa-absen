import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useProfilStore } from '../../stores/useProfilStore';
import { kelasRepo } from '../siswa/kelasRepository';
import { getAutoTahunPelajaran, getAutoSemester } from '../../lib/academicYear';
import { CheckCircle2, ChevronRight, ChevronLeft, Plus, X, GraduationCap, School, BookOpen, Sparkles } from 'lucide-react';

const SUGGESTED_MAPEL = [
  'Tematik',
  'Matematika',
  'Bahasa Indonesia',
  'IPA',
  'IPS',
  'Pendidikan Pancasila / PKn',
  'Pendidikan Agama',
  'PJOK',
  'Bahasa Inggris',
  'Seni Budaya',
  'Informatika',
];

const SUGGESTED_KELAS = ['1A', '1B', '2A', '2B', '3A', '4A', '5A', '6A', '7A', '7B', '8A', '9A', 'X-1', 'XI MIPA 1'];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { profil, saveProfil } = useProfilStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [namaPanggilan, setNamaPanggilan] = useState(profil?.namaPanggilan || '');
  const [namaGuru, setNamaGuru] = useState(profil?.namaGuru || '');
  const [nip, setNip] = useState(profil?.nip || '');
  const [sekolah, setSekolah] = useState(profil?.sekolah || '');
  const [tahunPelajaran, setTahunPelajaran] = useState(profil?.tahunPelajaran || getAutoTahunPelajaran());
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(profil?.semester || getAutoSemester());

  const [mapelList, setMapelList] = useState<string[]>(
    profil?.mapel && profil.mapel.length > 0 ? profil.mapel : ['Matematika']
  );
  const [customMapel, setCustomMapel] = useState('');

  const [kelasList, setKelasList] = useState<string[]>(
    profil?.kelasDiampu && profil.kelasDiampu.length > 0 ? profil.kelasDiampu : ['Kelas 1A']
  );
  const [customKelas, setCustomKelas] = useState('');

  const [kepalaSekolah, setKepalaSekolah] = useState(profil?.kepalaSekolah || '');
  const [nipKepsek, setNipKepsek] = useState(profil?.nipKepsek || '');
  const [tampilkanKredit, setTampilkanKredit] = useState(profil?.tampilkanKredit ?? true);

  const handleAddMapel = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !mapelList.includes(trimmed)) {
      setMapelList([...mapelList, trimmed]);
    }
    setCustomMapel('');
  };

  const handleRemoveMapel = (item: string) => {
    setMapelList(mapelList.filter((m) => m !== item));
  };

  const handleAddKelas = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !kelasList.includes(trimmed)) {
      setKelasList([...kelasList, trimmed]);
    }
    setCustomKelas('');
  };

  const handleRemoveKelas = (item: string) => {
    setKelasList(kelasList.filter((k) => k !== item));
  };

  const validateStep1 = () => {
    if (!namaPanggilan.trim()) {
      setErrorMsg('Nama panggilan wajib diisi (misal: Bu Ratna atau Pak Budi)');
      return false;
    }
    if (!namaGuru.trim()) {
      setErrorMsg('Nama lengkap guru wajib diisi');
      return false;
    }
    if (!sekolah.trim()) {
      setErrorMsg('Nama sekolah wajib diisi');
      return false;
    }
    if (mapelList.length === 0) {
      setErrorMsg('Pilih atau masukkan minimal satu mata pelajaran');
      return false;
    }
    if (!tahunPelajaran.trim()) {
      setErrorMsg('Tahun pelajaran wajib diisi');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (kelasList.length === 0) {
      setErrorMsg('Masukkan minimal 1 kelas yang Anda ampu');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // 1. Simpan profil
      await saveProfil({
        namaPanggilan: namaPanggilan.trim(),
        namaGuru: namaGuru.trim(),
        nip: nip.trim(),
        sekolah: sekolah.trim(),
        mapel: mapelList,
        kelasDiampu: kelasList,
        tahunPelajaran: tahunPelajaran.trim(),
        semester,
        kepalaSekolah: kepalaSekolah.trim(),
        nipKepsek: nipKepsek.trim(),
        tampilkanKredit,
        isOnboarded: true,
      });

      // 2. Simpan setiap kelas ke tabel records (kind: kelas) jika belum ada
      const existingClasses = await kelasRepo.getAll();
      const existingLabels = new Set(existingClasses.map((c) => c.label.toLowerCase()));

      for (const kLabel of kelasList) {
        if (!existingLabels.has(kLabel.toLowerCase())) {
          await kelasRepo.create({
            label: kLabel,
            tingkat: '',
            rombel: '',
            keterangan: '',
          });
        }
      }

      navigate('/', { replace: true });
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Gagal menyimpan profil. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 mb-1">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            BISA <span className="text-brand-600 dark:text-brand-400">Absen</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Asisten cerdas administrasi harian guru (Offline & Cepat)
          </p>
        </div>

        {/* Wizard Stepper */}
        <div className="flex items-center justify-between px-2" aria-label="Langkah registrasi">
          {[
            { num: 1, label: 'Biodata Guru' },
            { num: 2, label: 'Kelas Diampu' },
            { num: 3, label: 'Selesai' },
          ].map((item, idx) => (
            <React.Fragment key={item.num}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= item.num
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > item.num ? <CheckCircle2 className="w-5 h-5" /> : item.num}
                </div>
                <span className="text-xs font-semibold mt-1 text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    step > idx + 1 ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Biodata Guru */}
        {step === 1 && (
          <Card className="space-y-5 animate-in fade-in duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <School className="w-5 h-5 text-brand-600" />
                Langkah 1: Biodata & Sekolah
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Data ini digunakan untuk sapaan aplikasi dan kop laporan resmi.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nama Panggilan Anda"
                placeholder="Misal: Bu Ratna atau Pak Budi"
                value={namaPanggilan}
                onChange={(e) => setNamaPanggilan(e.target.value)}
                helperText="Digunakan untuk sapaan hangat di Beranda & suara pengingat"
                required
              />

              <Input
                label="Nama Lengkap & Gelar Guru"
                placeholder="Contoh: Ratna Sari, S.Pd."
                value={namaGuru}
                onChange={(e) => setNamaGuru(e.target.value)}
                helperText="Akan tercantum pada lembar tanda tangan dokumen"
                required
              />

              <Input
                label="NIP (Nomor Induk Pegawai)"
                placeholder="Kosongkan atau beri tanda '-' jika non-NIP"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
              />

              <Input
                label="Nama Sekolah / Institusi"
                placeholder="Contoh: SDN 1 Merdeka / SMP Negeri 2"
                value={sekolah}
                onChange={(e) => setSekolah(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tahun Pelajaran"
                  value={tahunPelajaran}
                  onChange={(e) => setTahunPelajaran(e.target.value)}
                  placeholder="2024/2025"
                  required
                />
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Semester
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
                  >
                    <option value="Ganjil">Ganjil (Jul - Des)</option>
                    <option value="Genap">Genap (Jan - Jun)</option>
                  </select>
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div className="space-y-2 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Mata Pelajaran yang Diampu <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {mapelList.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-200 rounded-full text-xs font-semibold"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() => handleRemoveMapel(m)}
                        className="text-brand-600 hover:text-rose-600"
                        aria-label={`Hapus ${m}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMapel}
                    onChange={(e) => setCustomMapel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMapel(customMapel);
                      }
                    }}
                    placeholder="Ketik mata pelajaran lain..."
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddMapel(customMapel)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Tambah
                  </Button>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-500 mb-1.5">Saran cepat (klik untuk menambahkan):</p>
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_MAPEL.filter((s) => !mapelList.includes(s))
                      .slice(0, 6)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleAddMapel(s)}
                          className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-700"
                        >
                          + {s}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
                Lanjut ke Kelas <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Kelas yang Diampu */}
        {step === 2 && (
          <Card className="space-y-5 animate-in fade-in duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                Langkah 2: Kelas yang Anda Ampu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Boleh menambahkan lebih dari satu kelas (misal: 1A, 1B, atau VII-A).
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Daftar Kelas Terpilih <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {kelasList.length === 0 ? (
                    <span className="text-xs text-slate-400 p-1">Belum ada kelas yang dipilih.</span>
                  ) : (
                    kelasList.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-sm"
                      >
                        {k}
                        <button
                          type="button"
                          onClick={() => handleRemoveKelas(k)}
                          className="hover:text-rose-200"
                          aria-label={`Hapus kelas ${k}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customKelas}
                    onChange={(e) => setCustomKelas(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKelas(customKelas);
                      }
                    }}
                    placeholder="Contoh: 4A, VII-B, X IPA 2"
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddKelas(customKelas)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Tambah
                  </Button>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-500 mb-1.5">Pilihan cepat:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_KELAS.filter((c) => !kelasList.includes(c)).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleAddKelas(c)}
                        className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-100 hover:text-brand-800 font-medium"
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-5 h-5 mr-1" /> Kembali
              </Button>
              <Button type="button" onClick={handleNext}>
                Lanjut Konfirmasi <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Konfirmasi & Selesai */}
        {step === 3 && (
          <Card className="space-y-5 animate-in fade-in duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Langkah 3: Konfirmasi & Siap Mengajar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Periksa ringkasan dan lengkapi data opsional dokumen jika diperlukan.
              </p>
            </div>

            {/* Overview Box */}
            <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 space-y-2 text-left text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Guru:</span>
                <span className="font-bold text-slate-900 dark:text-white">{namaGuru} ({namaPanggilan})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Sekolah:</span>
                <span className="font-bold text-slate-900 dark:text-white">{sekolah}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Tahun / Semester:</span>
                <Badge variant="brand">{tahunPelajaran} ({semester})</Badge>
              </div>
              <div className="flex justify-between items-start pt-1">
                <span className="text-slate-500 dark:text-slate-400">Kelas:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {kelasList.join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-500 dark:text-slate-400">Mapel:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {mapelList.join(', ')}
                </span>
              </div>
            </div>

            {/* Optional Principal fields */}
            <div className="space-y-3 pt-2 text-left">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Data Kepala Sekolah (Opsional - untuk tanda tangan rekap)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nama Kepala Sekolah"
                  placeholder="Contoh: Drs. H. Suryadi, M.Pd."
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                />
                <Input
                  label="NIP Kepala Sekolah"
                  placeholder="19700101..."
                  value={nipKepsek}
                  onChange={(e) => setNipKepsek(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-3 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tampilkanKredit}
                  onChange={(e) => setTampilkanKredit(e.target.checked)}
                  className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Sertakan catatan kaki 'Dibuat dengan Saku Guru' di dokumen cetak
                </span>
              </label>
            </div>

            <div className="pt-3 flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-5 h-5 mr-1" /> Kembali
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleFinish}
                isLoading={isSubmitting}
                className="w-full sm:w-auto"
              >
                Mulai Gunakan Saku Guru
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
