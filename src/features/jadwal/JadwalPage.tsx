import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { jadwalRepo } from './jadwalRepository';
import { kelasRepo } from '../siswa/kelasRepository';
import { useProfilStore } from '../../stores/useProfilStore';
import { syncEngine } from '../../services/sync/syncEngine';
import { NAMA_HARI, type JadwalData } from './jadwalSchema';
import type { KelasData } from '../siswa/kelasSchema';
import {
  Calendar,
  Clock,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Bell,
  X,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const JadwalPage: React.FC = () => {
  const { profil } = useProfilStore();
  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [jadwalList, setJadwalList] = useState<JadwalData[]>([]);
  const [loading, setLoading] = useState(true);

  // Hari aktif (1 = Senin .. 7 = Minggu)
  // Ambil hari ini: getDay() -> 0=Minggu, 1=Senin..
  const todayDayIndex = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const [activeHari, setActiveHari] = useState<number>(todayDayIndex);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeJadwal, setActiveJadwal] = useState<JadwalData | null>(null);

  // Form states
  const [formHari, setFormHari] = useState<number>(activeHari);
  const [formJamMulai, setFormJamMulai] = useState('07:30');
  const [formJamSelesai, setFormJamSelesai] = useState('09:00');
  const [formKelasId, setFormKelasId] = useState('');
  const [formMapel, setFormMapel] = useState('');
  const [formPengingatAktif, setFormPengingatAktif] = useState(true);
  const [formMenitSebelum, setFormMenitSebelum] = useState(10);

  // Copy modal state
  const [targetHariList, setTargetHariList] = useState<number[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const [allKelas, allJadwal] = await Promise.all([
        kelasRepo.getAll(),
        jadwalRepo.getAll(),
      ]);
      setKelasList(allKelas);
      setJadwalList(allJadwal);

      if (allKelas.length > 0 && !formKelasId) {
        setFormKelasId(allKelas[0].id);
      }
      if (profil?.mapel && profil.mapel.length > 0 && !formMapel) {
        setFormMapel(profil.mapel[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Berlangganan ke update SyncEngine (saat data ditarik dari Cloud / Realtime)
    const unsub = syncEngine.subscribe((state) => {
      if (state === 'synced' || state === 'idle') {
        loadData();
      }
    });
    return unsub;
  }, [profil]);

  const kelasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const k of kelasList) map.set(k.id, k.label);
    return map;
  }, [kelasList]);

  // Jadwal di hari aktif
  const currentDayJadwal = useMemo(() => {
    return jadwalList.filter((j) => j.hari === activeHari);
  }, [jadwalList, activeHari]);

  // Handlers
  const handleOpenAdd = () => {
    setFormHari(activeHari);
    setFormJamMulai('07:30');
    setFormJamSelesai('09:00');
    setFormKelasId(kelasList[0]?.id || '');
    setFormMapel(profil?.mapel?.[0] || 'Tematik');
    setFormPengingatAktif(true);
    setFormMenitSebelum(10);
    setShowAddModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKelasId || !formMapel.trim()) return;

    try {
      await jadwalRepo.create({
        hari: formHari,
        jamMulai: formJamMulai,
        jamSelesai: formJamSelesai,
        kelasId: formKelasId,
        mapel: formMapel.trim(),
        pengingat: {
          aktif: formPengingatAktif,
          menitSebelum: formMenitSebelum,
        },
      });
      await loadData();
      setShowAddModal(false);
      showToast(`Jadwal hari ${NAMA_HARI[formHari]} berhasil ditambahkan`);
      syncEngine.syncNow().catch(() => {});
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyimpan jadwal');
    }
  };

  const handleOpenEdit = (jadwal: JadwalData) => {
    setActiveJadwal(jadwal);
    setFormHari(jadwal.hari);
    setFormJamMulai(jadwal.jamMulai);
    setFormJamSelesai(jadwal.jamSelesai);
    setFormKelasId(jadwal.kelasId);
    setFormMapel(jadwal.mapel);
    setFormPengingatAktif(jadwal.pengingat?.aktif ?? true);
    setFormMenitSebelum(jadwal.pengingat?.menitSebelum ?? 10);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJadwal || !formKelasId || !formMapel.trim()) return;

    try {
      await jadwalRepo.update(activeJadwal.id, {
        hari: formHari,
        jamMulai: formJamMulai,
        jamSelesai: formJamSelesai,
        kelasId: formKelasId,
        mapel: formMapel.trim(),
        pengingat: {
          aktif: formPengingatAktif,
          menitSebelum: formMenitSebelum,
        },
      });
      await loadData();
      setShowEditModal(false);
      showToast('Perubahan jadwal berhasil disimpan');
      syncEngine.syncNow().catch(() => {});
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengubah jadwal');
    }
  };

  const handleOpenDelete = (jadwal: JadwalData) => {
    setActiveJadwal(jadwal);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!activeJadwal) return;
    try {
      await jadwalRepo.delete(activeJadwal.id);
      await loadData();
      setShowDeleteModal(false);
      showToast('Jadwal berhasil dihapus');
      syncEngine.syncNow().catch(() => {});
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus jadwal');
    }
  };

  const handleOpenCopy = () => {
    setTargetHariList([]);
    setShowCopyModal(true);
  };

  const handleToggleTargetHari = (hariNum: number) => {
    if (targetHariList.includes(hariNum)) {
      setTargetHariList(targetHariList.filter((h) => h !== hariNum));
    } else {
      setTargetHariList([...targetHariList, hariNum]);
    }
  };

  const handleExecuteCopy = async () => {
    if (targetHariList.length === 0) {
      alert('Pilih minimal satu hari tujuan');
      return;
    }

    try {
      for (const targetHari of targetHariList) {
        await jadwalRepo.copyDaySchedule(activeHari, targetHari);
      }
      await loadData();
      setShowCopyModal(false);
      showToast(
        `Jadwal ${NAMA_HARI[activeHari]} berhasil disalin ke ${targetHariList
          .map((h) => NAMA_HARI[h])
          .join(', ')}`
      );
      syncEngine.syncNow().catch(() => {});
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyalin jadwal');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat jadwal...</div>;
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

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-brand-600" />
            Jadwal Mengajar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Atur jam mengajar mingguan dan salin jadwal ke hari lain dengan cepat
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentDayJadwal.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleOpenCopy}>
              <Copy className="w-4 h-4 mr-1.5 text-brand-600" />
              Salin ke Hari Lain
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3, 4, 5, 6, 7].map((h) => {
          const count = jadwalList.filter((j) => j.hari === h).length;
          const isToday = h === todayDayIndex;
          const isActive = h === activeHari;

          return (
            <button
              key={h}
              type="button"
              onClick={() => setActiveHari(h)}
              className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all touch-target ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{NAMA_HARI[h]}</span>
                {isToday && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                    }`}
                  >
                    Hari Ini
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'text-brand-100' : 'text-slate-400'}`}>
                {count > 0 ? `${count} Sesi` : 'Libur'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Jadwal Cards for Active Day */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Jadwal Hari {NAMA_HARI[activeHari]} ({currentDayJadwal.length} Sesi Mengajar)
          </h2>
        </div>

        {currentDayJadwal.length === 0 ? (
          <Card className="text-center py-12 px-4 space-y-3 border-dashed">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Belum ada jadwal mengajar pada hari {NAMA_HARI[activeHari]}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Tambahkan sesi mengajar pertama Anda atau salin jadwal dari hari lain.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" variant="primary" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Sesi Mengajar
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {currentDayJadwal.map((jadwal) => (
              <Card
                key={jadwal.id}
                className="p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border hover:border-brand-400 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex flex-col items-center justify-center font-bold shrink-0">
                    <Clock className="w-5 h-5 mb-0.5 text-brand-600" />
                    <span className="text-[10px] leading-tight">{jadwal.jamMulai}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {jadwal.mapel}
                      </span>
                      <Badge variant="brand" className="text-xs">
                        Kelas {kelasMap.get(jadwal.kelasId) || '-'}
                      </Badge>
                      {jadwal.pengingat?.aktif && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-semibold">
                          <Bell className="w-3 h-3" />
                          {jadwal.pengingat.menitSebelum} mnt sblm
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Waktu KBM: <strong>{jadwal.jamMulai} - {jadwal.jamSelesai} WIB</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <Link
                    to={`/absensi?kelasId=${jadwal.kelasId}&mapel=${encodeURIComponent(jadwal.mapel)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 px-3 py-2 rounded-xl transition-colors"
                  >
                    Buka Absen <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(jadwal)}
                      className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Ubah Jadwal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(jadwal)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Hapus Jadwal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Tambah / Edit Jadwal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-600" />
                {showAddModal ? 'Tambah Jadwal Mengajar' : 'Ubah Jadwal Mengajar'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleSaveAdd : handleSaveEdit} className="space-y-3.5">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Hari
                </label>
                <select
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                  value={formHari}
                  onChange={(e) => setFormHari(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((h) => (
                    <option key={h} value={h}>
                      {NAMA_HARI[h]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Jam Mulai (HH:mm)"
                  type="time"
                  value={formJamMulai}
                  onChange={(e) => setFormJamMulai(e.target.value)}
                  required
                />
                <Input
                  label="Jam Selesai (HH:mm)"
                  type="time"
                  value={formJamSelesai}
                  onChange={(e) => setFormJamSelesai(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Kelas
                </label>
                <select
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  required
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kelas {k.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  list="mapel-options"
                  value={formMapel}
                  onChange={(e) => setFormMapel(e.target.value)}
                  placeholder="Ketik atau pilih mapel..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <datalist id="mapel-options">
                  {profil?.mapel?.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              {/* Pengingat settings */}
              <div className="pt-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Aktifkan Pengingat Kelas
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formPengingatAktif}
                    onChange={(e) => setFormPengingatAktif(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 accent-brand-600"
                  />
                </label>

                {formPengingatAktif && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Bunyikan notifikasi:</span>
                    <select
                      value={formMenitSebelum}
                      onChange={(e) => setFormMenitSebelum(Number(e.target.value))}
                      className="px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value={5}>5 menit sebelum</option>
                      <option value={10}>10 menit sebelum</option>
                      <option value={15}>15 menit sebelum</option>
                      <option value={30}>30 menit sebelum</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  {showAddModal ? 'Simpan Jadwal' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Salin Jadwal ke Hari Lain */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-brand-600" />
                Salin Jadwal Hari {NAMA_HARI[activeHari]}
              </h3>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pilih hari tujuan. Jadwal yang sudah ada pada hari tujuan <strong>tidak akan terhapus</strong>, melainkan ditambahkan.
            </p>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7]
                .filter((h) => h !== activeHari)
                .map((h) => (
                  <label
                    key={h}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Hari {NAMA_HARI[h]}
                    </span>
                    <input
                      type="checkbox"
                      checked={targetHariList.includes(h)}
                      onChange={() => handleToggleTargetHari(h)}
                      className="w-4 h-4 rounded text-brand-600 accent-brand-600"
                    />
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowCopyModal(false)}>
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={targetHariList.length === 0}
                onClick={handleExecuteCopy}
              >
                Salin Jadwal ({targetHariList.length} Hari)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Konfirmasi Hapus */}
      {showDeleteModal && activeJadwal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Hapus Sesi Mengajar?
              </h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus jadwal <strong>{activeJadwal.mapel}</strong> ({activeJadwal.jamMulai} - {activeJadwal.jamSelesai})?
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmDelete}>
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
