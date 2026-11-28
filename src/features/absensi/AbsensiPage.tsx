import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { absensiRepo } from './absensiRepository';
import { kelasRepo } from '../siswa/kelasRepository';
import { siswaRepo } from '../siswa/siswaRepository';
import { useProfilStore } from '../../stores/useProfilStore';
import {
  hitungRekapKehadiran,
  type StatusKehadiran,
  type EntriAbsensi,
} from './absensiSchema';
import type { KelasData } from '../siswa/kelasSchema';
import type { SiswaData } from '../siswa/siswaSchema';
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  Check,
  Users,
  Search,
  Save,
  Clock,
} from 'lucide-react';

export const AbsensiPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { profil } = useProfilStore();

  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form selectors
  const [tanggal, setTanggal] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [catatan, setCatatan] = useState('');

  // Attendance state: map siswaId -> StatusKehadiran
  const [statusMap, setStatusMap] = useState<Record<string, StatusKehadiran>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [kList, sList] = await Promise.all([
          kelasRepo.getAll(),
          siswaRepo.getAll(),
        ]);
        setKelasList(kList);
        setSiswaList(sList);

        // Check query params
        const qKelas = searchParams.get('kelasId');
        const qMapel = searchParams.get('mapel');

        const initialKelasId =
          qKelas && kList.some((k) => k.id === qKelas)
            ? qKelas
            : kList[0]?.id || '';

        const initialMapel =
          qMapel || (profil?.mapel && profil.mapel.length > 0 ? profil.mapel[0] : 'Tematik');

        setSelectedKelasId(initialKelasId);
        setSelectedMapel(initialMapel);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [profil, searchParams]);

  // Load existing session if previously saved
  useEffect(() => {
    if (!tanggal || !selectedKelasId || !selectedMapel) return;

    async function loadExistingSession() {
      try {
        const session = await absensiRepo.findSession(tanggal, selectedKelasId, selectedMapel);
        if (session) {
          const map: Record<string, StatusKehadiran> = {};
          for (const entri of session.entri) {
            map[entri.siswaId] = entri.status;
          }
          setStatusMap(map);
          setCatatan(session.catatan || '');
        } else {
          // Reset status map for fresh session
          setStatusMap({});
          setCatatan('');
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadExistingSession();
  }, [tanggal, selectedKelasId, selectedMapel]);

  // Siswa in active class
  const classStudents = useMemo(() => {
    return siswaList.filter((s) => s.kelasId === selectedKelasId);
  }, [siswaList, selectedKelasId]);

  // Filtered siswa with search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter((s) => s.nama.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  // Hitungan H/S/I/A real-time
  const rekap = useMemo(() => {
    const entries: EntriAbsensi[] = classStudents.map((s) => ({
      siswaId: s.id,
      status: statusMap[s.id] || 'H', // default jika belum ditandai dianggap Hadir untuk kalkulasi rekap
    }));
    return hitungRekapKehadiran(entries);
  }, [classStudents, statusMap]);

  // Jumlah siswa yang sudah ditandai secara eksplisit
  const markedCount = useMemo(() => {
    return classStudents.filter((s) => statusMap[s.id] !== undefined).length;
  }, [classStudents, statusMap]);

  // Set status kehadiran langsung (Hadir, Sakit, Izin, Alpha)
  const handleSetStatus = (siswaId: string, status: StatusKehadiran) => {
    setStatusMap((prev) => ({
      ...prev,
      [siswaId]: status,
    }));
  };

  // Tandai Semua Hadir
  const handleMarkAllHadir = () => {
    const newMap: Record<string, StatusKehadiran> = {};
    for (const s of classStudents) {
      newMap[s.id] = 'H';
    }
    setStatusMap(newMap);
    showToast('Semua siswa ditandai Hadir');
  };

  // Simpan absensi
  const handleSaveAbsensi = async () => {
    if (!tanggal || !selectedKelasId || !selectedMapel) {
      alert('Pilih tanggal, kelas, dan mapel terlebih dahulu');
      return;
    }

    if (classStudents.length === 0) {
      alert('Belum ada data siswa di kelas ini');
      return;
    }

    setIsSaving(true);
    try {
      // Aturan bisnis: "siswa belum ditandai otomatis Hadir saat disimpan"
      const entri: EntriAbsensi[] = classStudents.map((s) => ({
        siswaId: s.id,
        status: statusMap[s.id] || 'H',
      }));

      // Update local state map agar mencerminkan yang tersimpan
      const finalMap: Record<string, StatusKehadiran> = {};
      for (const e of entri) {
        finalMap[e.siswaId] = e.status;
      }
      setStatusMap(finalMap);

      await absensiRepo.saveSession(tanggal, selectedKelasId, selectedMapel, entri, catatan);
      showToast('Data absensi berhasil disimpan!');
    } catch (e: unknown) {
      console.error(e);
      alert('Gagal menyimpan absensi');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat absensi...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-10 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-700/20 text-sm font-bold animate-in fade-in">
          <Check className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-brand-600" />
            Absensi Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ketuk nama siswa untuk siklus kehadiran (Hadir → Sakit → Izin → Alfa)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllHadir}>
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
            Semua Hadir
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={handleSaveAbsensi}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Simpan Absen
          </Button>
        </div>
      </div>

      {/* Session Filter Bar (Tanggal, Kelas, Mapel) */}
      <Card className="p-4 bg-white dark:bg-slate-900 border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tanggal */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-600" /> Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Kelas */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-brand-600" /> Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500"
            >
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mata Pelajaran */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" /> Mata Pelajaran
            </label>
            <input
              type="text"
              list="mapel-list"
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              placeholder="Contoh: Matematika"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500"
            />
            <datalist id="mapel-list">
              {profil?.mapel?.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Real-time Counter Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500">Total Murid</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              {rekap.total}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              (H) Hadir
            </span>
            <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
              {rekap.hadir}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              (S) Sakit
            </span>
            <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
              {rekap.sakit}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/40">
            <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
              (I) Izin
            </span>
            <span className="text-sm font-extrabold text-sky-700 dark:text-sky-300">
              {rekap.izin}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
              (A) Alfa
            </span>
            <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300">
              {rekap.alfa}
            </span>
          </div>
        </div>

        {/* Persen Hadir Banner */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Tingkat Kehadiran Kelas: <strong>{rekap.persenHadir}%</strong>
          </span>
          <span className="text-[11px] text-slate-500">
            {markedCount} dari {classStudents.length} siswa sudah ditandai manual
          </span>
        </div>
      </Card>

      {/* Quick Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari siswa dalam kelas ini..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Student Attendance List */}
      {classStudents.length === 0 ? (
        <Card className="text-center py-12 px-4 space-y-3 border-dashed">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Belum ada siswa di kelas ini
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Tambahkan siswa terlebih dahulu di modul Kelola Siswa atau impor melalui Excel.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((siswa, idx) => {
            const currentStatus = statusMap[siswa.id] || 'H';

            return (
              <div
                key={siswa.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-slate-400 w-5 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      siswa.jenisKelamin === 'L'
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {siswa.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {siswa.nama}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                </div>

                {/* Tombol Pilihan Status Absensi: Hadir, Sakit, Izin, Alpha */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                  {/* Hadir */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(siswa.id, 'H')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      currentStatus === 'H'
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                    title="Tandai Hadir"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Hadir</span>
                  </button>

                  {/* Sakit */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(siswa.id, 'S')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentStatus === 'S'
                        ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-500 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                    title="Tandai Sakit"
                  >
                    <span>Sakit</span>
                  </button>

                  {/* Izin / Ijin */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(siswa.id, 'I')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentStatus === 'I'
                        ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-500 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                    title="Tandai Izin"
                  >
                    <span>Izin</span>
                  </button>

                  {/* Alpha */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(siswa.id, 'A')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentStatus === 'A'
                        ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-500 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                    title="Tandai Alpha / Tanpa Keterangan"
                  >
                    <span>Alpha</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Save Bar on Mobile */}
      <div className="pt-4 flex justify-between items-center gap-3">
        <p className="text-xs text-slate-500">
          *Siswa bertanda <em>(Hadir)*</em> otomatis disimpan sebagai Hadir jika tidak diubah.
        </p>

        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSaveAbsensi}
        >
          <Save className="w-4 h-4 mr-1.5" /> Simpan Absensi
        </Button>
      </div>
    </div>
  );
};
