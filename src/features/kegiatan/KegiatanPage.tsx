import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { kegiatanRepo } from './kegiatanRepository';
import { siswaRepo } from '../siswa/siswaRepository';
import { kelasRepo } from '../siswa/kelasRepository';
import {
  hitungRekapKehadiran,
  type StatusKehadiran,
} from '../absensi/absensiSchema';
import type {
  KegiatanData,
  JurnalKegiatanData,
} from './kegiatanSchema';
import type { SiswaData } from '../siswa/siswaSchema';
import type { KelasData } from '../siswa/kelasSchema';
import {
  Sparkles,
  Users,
  UserCheck,
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  Save,
  CheckCircle2,
  Clock,
  UserPlus,
} from 'lucide-react';

export const KegiatanPage: React.FC = () => {
  const [kegiatanList, setKegiatanList] = useState<KegiatanData[]>([]);
  const [activeKegiatanId, setActiveKegiatanId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'anggota' | 'absensi' | 'jurnal'>('anggota');

  const [allSiswa, setAllSiswa] = useState<SiswaData[]>([]);
  const [allKelas, setAllKelas] = useState<KelasData[]>([]);
  const [anggotaSiswaIds, setAnggotaSiswaIds] = useState<string[]>([]);
  const [jurnalList, setJurnalList] = useState<JurnalKegiatanData[]>([]);
  const [loading, setLoading] = useState(true);

  // Absensi state
  const [absenTanggal, setAbsenTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusMap, setStatusMap] = useState<Record<string, StatusKehadiran>>({});
  const [isSavingAbsen, setIsSavingAbsen] = useState(false);

  // Modals
  const [showAddKegiatanModal, setShowAddKegiatanModal] = useState(false);
  const [showManageAnggotaModal, setShowManageAnggotaModal] = useState(false);
  const [showAddJurnalModal, setShowAddJurnalModal] = useState(false);
  const [selectedAnggotaIds, setSelectedAnggotaIds] = useState<string[]>([]);

  // Form states Kegiatan
  const [formNama, setFormNama] = useState('');
  const [formJenis, setFormJenis] = useState<'Ekstrakurikuler' | 'Les' | 'Klub'>('Ekstrakurikuler');
  const [formJadwal, setFormJadwal] = useState('');
  const [formPembimbing, setFormPembimbing] = useState('');

  // Form states Jurnal
  const [formJurnalTgl, setFormJurnalTgl] = useState(() => new Date().toISOString().split('T')[0]);
  const [formRingkasan, setFormRingkasan] = useState('');
  const [formCatatan, setFormCatatan] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial load
  const loadInitialData = async () => {
    try {
      const [kList, sList, klList] = await Promise.all([
        kegiatanRepo.getAllKegiatan(),
        siswaRepo.getAll(),
        kelasRepo.getAll(),
      ]);
      setKegiatanList(kList);
      setAllSiswa(sList);
      setAllKelas(klList);

      if (kList.length > 0 && !activeKegiatanId) {
        setActiveKegiatanId(kList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When active kegiatan changes, load its members and journals
  useEffect(() => {
    if (!activeKegiatanId) return;

    async function loadKegiatanDetails() {
      try {
        const [anggotas, jurnals] = await Promise.all([
          kegiatanRepo.getAnggotaByKegiatan(activeKegiatanId),
          kegiatanRepo.getJurnalByKegiatan(activeKegiatanId),
        ]);
        const ids = anggotas.map((a) => a.siswaId);
        setAnggotaSiswaIds(ids);
        setJurnalList(jurnals);

        // Load attendance session for today
        const session = await kegiatanRepo.getAbsensiSession(activeKegiatanId, absenTanggal);
        if (session) {
          const map: Record<string, StatusKehadiran> = {};
          for (const entri of session.entri) map[entri.siswaId] = entri.status;
          setStatusMap(map);
        } else {
          setStatusMap({});
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadKegiatanDetails();
  }, [activeKegiatanId, absenTanggal]);

  const activeKegiatan = useMemo(() => {
    return kegiatanList.find((k) => k.id === activeKegiatanId);
  }, [kegiatanList, activeKegiatanId]);

  const kelasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const k of allKelas) map.set(k.id, k.label);
    return map;
  }, [allKelas]);

  // Siswa yang terdaftar sebagai anggota
  const memberStudents = useMemo(() => {
    const idSet = new Set(anggotaSiswaIds);
    return allSiswa.filter((s) => idSet.has(s.id));
  }, [allSiswa, anggotaSiswaIds]);

  // Rekap kehadiran kegiatan
  const rekap = useMemo(() => {
    const entries = memberStudents.map((s) => ({
      siswaId: s.id,
      status: statusMap[s.id] || 'H',
    }));
    return hitungRekapKehadiran(entries);
  }, [memberStudents, statusMap]);

  // Handlers Kegiatan CRUD
  const handleOpenAddKegiatan = () => {
    setFormNama('');
    setFormJenis('Ekstrakurikuler');
    setFormJadwal('Setiap Jumat 14:00 - 15:30');
    setFormPembimbing('');
    setShowAddKegiatanModal(true);
  };

  const handleSaveKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    try {
      const created = await kegiatanRepo.createKegiatan({
        nama: formNama.trim(),
        jenis: formJenis,
        jadwalDeskripsi: formJadwal.trim(),
        pembimbing: formPembimbing.trim(),
      });
      await loadInitialData();
      setActiveKegiatanId(created.id);
      setShowAddKegiatanModal(false);
      showToast(`Kegiatan ${created.nama} berhasil dibuat`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyimpan kegiatan');
    }
  };

  const handleDeleteKegiatan = async () => {
    if (!activeKegiatan) return;
    if (confirm(`Yakin ingin menghapus kegiatan "${activeKegiatan.nama}"?`)) {
      try {
        await kegiatanRepo.deleteKegiatan(activeKegiatan.id);
        const remaining = kegiatanList.filter((k) => k.id !== activeKegiatan.id);
        setKegiatanList(remaining);
        if (remaining.length > 0) setActiveKegiatanId(remaining[0].id);
        else setActiveKegiatanId('');
        showToast('Kegiatan berhasil dihapus');
      } catch (err: unknown) {
        alert((err as Error).message || 'Gagal menghapus kegiatan');
      }
    }
  };

  // Handlers Anggota
  const handleOpenManageAnggota = () => {
    setSelectedAnggotaIds([...anggotaSiswaIds]);
    setShowManageAnggotaModal(true);
  };

  const handleToggleStudent = (siswaId: string) => {
    if (selectedAnggotaIds.includes(siswaId)) {
      setSelectedAnggotaIds(selectedAnggotaIds.filter((id) => id !== siswaId));
    } else {
      setSelectedAnggotaIds([...selectedAnggotaIds, siswaId]);
    }
  };

  const handleSaveAnggota = async () => {
    if (!activeKegiatanId) return;
    try {
      await kegiatanRepo.setAnggota(activeKegiatanId, selectedAnggotaIds);
      setAnggotaSiswaIds(selectedAnggotaIds);
      setShowManageAnggotaModal(false);
      showToast(`${selectedAnggotaIds.length} anggota berhasil disimpan`);
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menyimpan anggota');
    }
  };

  // Handlers Absensi Kegiatan
  const handleSetStatus = (siswaId: string, status: StatusKehadiran) => {
    setStatusMap((prev) => ({
      ...prev,
      [siswaId]: status,
    }));
  };

  const handleMarkAllHadir = () => {
    const map: Record<string, StatusKehadiran> = {};
    for (const s of memberStudents) map[s.id] = 'H';
    setStatusMap(map);
    showToast('Semua anggota ditandai Hadir');
  };

  const handleSaveAbsensi = async () => {
    if (!activeKegiatanId || memberStudents.length === 0) return;
    setIsSavingAbsen(true);
    try {
      const entri = memberStudents.map((s) => ({
        siswaId: s.id,
        status: statusMap[s.id] || 'H',
      }));
      await kegiatanRepo.saveAbsensiSession(activeKegiatanId, absenTanggal, entri);
      showToast('Absensi kegiatan berhasil disimpan');
    } catch (e: unknown) {
      console.error(e);
      alert('Gagal menyimpan absensi');
    } finally {
      setIsSavingAbsen(false);
    }
  };

  // Handlers Jurnal Kegiatan
  const handleSaveJurnal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKegiatanId || !formRingkasan.trim()) return;

    try {
      const created = await kegiatanRepo.createJurnal({
        kegiatanId: activeKegiatanId,
        tanggal: formJurnalTgl,
        ringkasan: formRingkasan.trim(),
        catatan: formCatatan.trim(),
      });
      setJurnalList([created, ...jurnalList]);
      setShowAddJurnalModal(false);
      setFormRingkasan('');
      setFormCatatan('');
      showToast('Catatan jurnal kegiatan tersimpan');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyimpan jurnal');
    }
  };

  const handleDeleteJurnal = async (id: string) => {
    if (confirm('Hapus catatan jurnal ini?')) {
      try {
        await kegiatanRepo.deleteJurnal(id);
        setJurnalList(jurnalList.filter((j) => j.id !== id));
        showToast('Catatan jurnal dihapus');
      } catch (err: unknown) {
        alert((err as Error).message || 'Gagal menghapus jurnal');
      }
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat modul kegiatan...</div>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-brand-600" />
            Ekstrakurikuler & Les
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola anggota lintas kelas, absensi kegiatan, dan jurnal les mandiri
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAddKegiatan}>
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Kegiatan
        </Button>
      </div>

      {/* Kegiatan Tabs */}
      {kegiatanList.length === 0 ? (
        <Card className="text-center py-12 px-4 space-y-3 border-dashed">
          <Sparkles className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Belum ada kegiatan ekstrakurikuler atau les
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Buat kegiatan ekstrakurikuler seperti Pramuka, Futsal, atau bimbingan belajar/les tambahan.
          </p>
          <Button size="sm" variant="primary" onClick={handleOpenAddKegiatan}>
            <Plus className="w-4 h-4 mr-1.5" /> Buat Kegiatan Baru
          </Button>
        </Card>
      ) : (
        <>
          {/* List Kegiatan Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {kegiatanList.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setActiveKegiatanId(k.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all touch-target ${
                  activeKegiatanId === k.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-400'
                }`}
              >
                {k.nama}
              </button>
            ))}
          </div>

          {/* Active Kegiatan Banner & Sub-Tabs */}
          {activeKegiatan && (
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
                      {activeKegiatan.nama}
                    </h2>
                    <Badge variant="brand">{activeKegiatan.jenis}</Badge>
                  </div>
                  {activeKegiatan.jadwalDeskripsi && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      {activeKegiatan.jadwalDeskripsi}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteKegiatan}
                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Kegiatan
                  </Button>
                </div>
              </div>

              {/* Sub-Tabs: Anggota | Absensi | Jurnal */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
                {[
                  { key: 'anggota', label: `Anggota (${memberStudents.length})`, icon: Users },
                  { key: 'absensi', label: 'Absensi Kegiatan', icon: UserCheck },
                  { key: 'jurnal', label: `Jurnal (${jurnalList.length})`, icon: BookOpen },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key as typeof activeTab)}
                      className={`flex items-center gap-2 pb-3 font-bold text-xs transition-colors border-b-2 -mb-px ${
                        isActive
                          ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* SUB-TAB 1: ANGGOTA LINTAS KELAS */}
              {activeTab === 'anggota' && (
                <div className="space-y-4 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Satu kegiatan dapat beranggotakan siswa dari gabungan berbagai kelas.
                    </p>
                    <Button size="sm" variant="primary" onClick={handleOpenManageAnggota}>
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      Pilih / Kelola Anggota
                    </Button>
                  </div>

                  {memberStudents.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-2xl p-4 text-xs text-slate-400">
                      Belum ada anggota yang didaftarkan ke kegiatan ini. Ketuk tombol Pilih Anggota untuk memasukkan siswa lintas kelas.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {memberStudents.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-slate-400 w-4 text-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {s.nama}
                              </p>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Asal: Kelas {kelasMap.get(s.kelasId) || '-'}
                              </span>
                            </div>
                          </div>
                          <Badge variant="neutral">{s.jenisKelamin}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 2: ABSENSI KEGIATAN */}
              {activeTab === 'absensi' && (
                <div className="space-y-4 pt-1 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Tanggal:</span>
                      <input
                        type="date"
                        value={absenTanggal}
                        onChange={(e) => setAbsenTanggal(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleMarkAllHadir}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Semua Hadir
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={isSavingAbsen}
                        onClick={handleSaveAbsensi}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" /> Simpan Absen
                      </Button>
                    </div>
                  </div>

                  {/* Counter Stat Bar */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                      H: {rekap.hadir}
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
                      S: {rekap.sakit}
                    </div>
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200">
                      I: {rekap.izin}
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200">
                      A: {rekap.alfa}
                    </div>
                  </div>

                  {memberStudents.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Belum ada anggota. Tambahkan anggota di tab Anggota terlebih dahulu.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberStudents.map((s, idx) => {
                        const currentStatus = statusMap[s.id] || 'H';
                        return (
                          <div
                            key={s.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-semibold text-slate-400 w-5 shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {s.nama}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  Kelas {kelasMap.get(s.kelasId)}
                                </span>
                              </div>
                            </div>

                            {/* Tombol Pilihan Status Absensi Kegiatan */}
                            <div className="flex items-center gap-1 self-end sm:self-auto shrink-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleSetStatus(s.id, 'H')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  currentStatus === 'H'
                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600 font-extrabold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>Hadir</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatus(s.id, 'S')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentStatus === 'S'
                                    ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-500 font-extrabold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                              >
                                <span>Sakit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatus(s.id, 'I')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentStatus === 'I'
                                    ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-500 font-extrabold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                              >
                                <span>Izin</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatus(s.id, 'A')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentStatus === 'A'
                                    ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-500 font-extrabold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                              >
                                <span>Alpha</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: JURNAL KEGIATAN */}
              {activeTab === 'jurnal' && (
                <div className="space-y-4 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Catat aktivitas, materi les, dan progres kegiatan.
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setFormJurnalTgl(new Date().toISOString().split('T')[0]);
                        setFormRingkasan('');
                        setFormCatatan('');
                        setShowAddJurnalModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Tulis Jurnal Kegiatan
                    </Button>
                  </div>

                  {jurnalList.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-2xl p-4 text-xs text-slate-400">
                      Belum ada catatan jurnal untuk kegiatan ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jurnalList.map((j) => (
                        <div
                          key={j.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-xs font-bold text-brand-600 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(j.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteJurnal(j.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                            {j.ringkasan}
                          </p>

                          {j.catatan && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-600 dark:text-slate-400">
                              <strong>Catatan Tambahan:</strong> {j.catatan}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* MODAL: Tambah Kegiatan Baru */}
      {showAddKegiatanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                Tambah Kegiatan / Les Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddKegiatanModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKegiatan} className="space-y-4">
              <Input
                label="Nama Kegiatan"
                placeholder="Contoh: Pramuka, Futsal, atau Les Berhitung"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                autoFocus
                required
              />

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Jenis Kegiatan
                </label>
                <select
                  value={formJenis}
                  onChange={(e) =>
                    setFormJenis(e.target.value as 'Ekstrakurikuler' | 'Les' | 'Klub')
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Ekstrakurikuler">Ekstrakurikuler</option>
                  <option value="Les">Les Tambahan / Bimbel</option>
                  <option value="Klub">Klub Minat & Bakat</option>
                </select>
              </div>

              <Input
                label="Jadwal / Waktu Pertemuan"
                placeholder="Contoh: Jumat, 14:00 - 15:30"
                value={formJadwal}
                onChange={(e) => setFormJadwal(e.target.value)}
              />

              <Input
                label="Guru Pendamping / Pembimbing (Opsional)"
                placeholder="Nama guru"
                value={formPembimbing}
                onChange={(e) => setFormPembimbing(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddKegiatanModal(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Buat Kegiatan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Kelola Anggota Lintas Kelas */}
      {showManageAnggotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  Pilih Anggota ({selectedAnggotaIds.length} Terpilih)
                </h3>
                <p className="text-xs text-slate-500">Centang siswa yang mengikuti kegiatan ini</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageAnggotaModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checklist per Kelas */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {allKelas.map((kelas) => {
                const classMurids = allSiswa.filter((s) => s.kelasId === kelas.id);
                if (classMurids.length === 0) return null;

                return (
                  <div key={kelas.id} className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 py-1">
                      Kelas {kelas.label}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {classMurids.map((s) => {
                        const isChecked = selectedAnggotaIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 font-bold text-brand-900 dark:text-brand-200'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate pr-1">{s.nama}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStudent(s.id)}
                              className="w-4 h-4 rounded text-brand-600 accent-brand-600 shrink-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowManageAnggotaModal(false)}>
                Batal
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveAnggota}>
                Simpan Anggota ({selectedAnggotaIds.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Jurnal Kegiatan */}
      {showAddJurnalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                Tulis Jurnal Kegiatan
              </h3>
              <button
                type="button"
                onClick={() => setShowAddJurnalModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJurnal} className="space-y-4">
              <Input
                label="Tanggal Kegiatan"
                type="date"
                value={formJurnalTgl}
                onChange={(e) => setFormJurnalTgl(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Ringkasan Aktivitas / Materi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formRingkasan}
                  onChange={(e) => setFormRingkasan(e.target.value)}
                  placeholder="Contoh: Latihan tali temali simpul mati & simpul hidup, persiapan kemah sabtu-minggu."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Catatan Evaluasi / Tindak Lanjut (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Contoh: Siswa kelas 7 perlu pendampingan tambahan pada materi simpul rantai."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddJurnalModal(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Simpan Jurnal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
