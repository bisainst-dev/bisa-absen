import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { jurnalRepo } from './jurnalRepository';
import { kelasRepo } from '../siswa/kelasRepository';
import { useProfilStore } from '../../stores/useProfilStore';
import type { KelasData } from '../siswa/kelasSchema';
import type { JurnalData } from './jurnalSchema';
import {
  BookOpen,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  AlertTriangle,
  Lightbulb,
  Bell,
} from 'lucide-react';

export const JurnalPage: React.FC = () => {
  const { profil } = useProfilStore();
  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [jurnalList, setJurnalList] = useState<JurnalData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterKelasId, setFilterKelasId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeJurnal, setActiveJurnal] = useState<JurnalData | null>(null);

  // Form states
  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [formKelasId, setFormKelasId] = useState('');
  const [formMapel, setFormMapel] = useState('');
  const [formPertemuanKe, setFormPertemuanKe] = useState(1);
  const [formMateri, setFormMateri] = useState('');
  const [formCatatanBerikutnya, setFormCatatanBerikutnya] = useState('');
  const [formPengingat, setFormPengingat] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const [kList, jList] = await Promise.all([
        kelasRepo.getAll(),
        jurnalRepo.getAll(),
      ]);
      setKelasList(kList);
      setJurnalList(jList);

      if (kList.length > 0 && !formKelasId) {
        setFormKelasId(kList[0].id);
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
  }, [profil]);

  const kelasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const k of kelasList) map.set(k.id, k.label);
    return map;
  }, [kelasList]);

  // Filtered Jurnal List
  const filteredJurnal = useMemo(() => {
    return jurnalList.filter((j) => {
      const matchKelas = filterKelasId === 'all' || j.kelasId === filterKelasId;
      const matchSearch =
        !searchQuery.trim() ||
        j.materi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.catatanPertemuanBerikutnya.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }, [jurnalList, filterKelasId, searchQuery]);

  // Handlers
  const handleOpenAdd = () => {
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormKelasId(filterKelasId !== 'all' ? filterKelasId : kelasList[0]?.id || '');
    setFormMapel(profil?.mapel?.[0] || 'Tematik');

    // Auto increment pertemuan ke berdasarkan kelas & mapel
    const sameSessionCount = jurnalList.filter(
      (j) => j.kelasId === (filterKelasId !== 'all' ? filterKelasId : kelasList[0]?.id)
    ).length;
    setFormPertemuanKe(sameSessionCount + 1);

    setFormMateri('');
    setFormCatatanBerikutnya('');
    setFormPengingat('');
    setShowAddModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTanggal || !formKelasId || !formMapel || !formMateri.trim()) {
      alert('Mohon lengkapi tanggal, kelas, mapel, dan materi pembelajaran');
      return;
    }

    try {
      await jurnalRepo.create({
        tanggal: formTanggal,
        kelasId: formKelasId,
        mapel: formMapel.trim(),
        pertemuanKe: Number(formPertemuanKe) || 1,
        materi: formMateri.trim(),
        catatanPertemuanBerikutnya: formCatatanBerikutnya.trim(),
        pengingat: formPengingat.trim(),
      });
      await loadData();
      setShowAddModal(false);
      showToast('Jurnal mengajar berhasil disimpan');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyimpan jurnal');
    }
  };

  const handleOpenEdit = (jurnal: JurnalData) => {
    setActiveJurnal(jurnal);
    setFormTanggal(jurnal.tanggal);
    setFormKelasId(jurnal.kelasId);
    setFormMapel(jurnal.mapel);
    setFormPertemuanKe(jurnal.pertemuanKe || 1);
    setFormMateri(jurnal.materi);
    setFormCatatanBerikutnya(jurnal.catatanPertemuanBerikutnya || '');
    setFormPengingat(jurnal.pengingat || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJurnal || !formMateri.trim()) return;

    try {
      await jurnalRepo.update(activeJurnal.id, {
        tanggal: formTanggal,
        kelasId: formKelasId,
        mapel: formMapel.trim(),
        pertemuanKe: Number(formPertemuanKe) || 1,
        materi: formMateri.trim(),
        catatanPertemuanBerikutnya: formCatatanBerikutnya.trim(),
        pengingat: formPengingat.trim(),
      });
      await loadData();
      setShowEditModal(false);
      showToast('Perubahan jurnal berhasil disimpan');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengubah jurnal');
    }
  };

  const handleOpenDelete = (jurnal: JurnalData) => {
    setActiveJurnal(jurnal);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!activeJurnal) return;
    try {
      await jurnalRepo.delete(activeJurnal.id);
      await loadData();
      setShowDeleteModal(false);
      showToast('Jurnal mengajar berhasil dihapus');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus jurnal');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat jurnal...</div>;
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
            <BookOpen className="w-7 h-7 text-brand-600" />
            Jurnal Mengajar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasi materi KBM harian dan catatan persiapan pertemuan berikutnya
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Tulis Jurnal
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterKelasId('all')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              filterKelasId === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Semua Kelas
          </button>
          {kelasList.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setFilterKelasId(k.id)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                filterKelasId === k.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Kelas {k.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari materi / catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Jurnal Cards List */}
      {filteredJurnal.length === 0 ? (
        <Card className="text-center py-12 px-4 space-y-3 border-dashed">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Belum ada catatan jurnal mengajar
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Catat materi yang sudah diajarkan hari ini dan persiapan untuk pertemuan berikutnya.
            </p>
          </div>
          <div className="pt-2">
            <Button size="sm" variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1.5" /> Tulis Jurnal Sekarang
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJurnal.map((jurnal) => {
            const dateObj = new Date(jurnal.tanggal);
            const formattedDate = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <Card
                key={jurnal.id}
                className="p-5 space-y-3 border hover:border-brand-400 transition-colors"
              >
                {/* Header card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Pertemuan Ke-{jurnal.pertemuanKe || 1}
                    </span>
                    <Badge variant="brand">Kelas {kelasMap.get(jurnal.kelasId) || '-'}</Badge>
                    <Badge variant="neutral">{jurnal.mapel}</Badge>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-brand-600" />
                      {formattedDate}
                    </span>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(jurnal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Ubah Jurnal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(jurnal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Hapus Jurnal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Materi */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Materi yang Diajarkan:
                  </h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {jurnal.materi}
                  </p>
                </div>

                {/* Catatan Pertemuan Berikutnya */}
                {jurnal.catatanPertemuanBerikutnya && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Catatan Pertemuan Berikutnya:</strong>
                      <span className="whitespace-pre-line">{jurnal.catatanPertemuanBerikutnya}</span>
                    </div>
                  </div>
                )}

                {/* Pengingat Khusus jika ada */}
                {jurnal.pengingat && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <Bell className="w-3.5 h-3.5 text-brand-600" />
                    <span>Pengingat: {jurnal.pengingat}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: Tambah / Edit Jurnal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                {showAddModal ? 'Tulis Jurnal Mengajar' : 'Ubah Jurnal Mengajar'}
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

            <form onSubmit={showAddModal ? handleSaveAdd : handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Tanggal KBM"
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  required
                />
                <Input
                  label="Pertemuan Ke-"
                  type="number"
                  min={1}
                  value={formPertemuanKe}
                  onChange={(e) => setFormPertemuanKe(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    list="mapel-jurnal-options"
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    placeholder="Mata Pelajaran"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <datalist id="mapel-jurnal-options">
                    {profil?.mapel?.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Materi Pembelajaran yang Disampaikan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formMateri}
                  onChange={(e) => setFormMateri(e.target.value)}
                  placeholder="Contoh: Operasi hitung perkalian pecahan desimal, siswa mengerjakan latihan mandiri."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Catatan Pertemuan Berikutnya (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formCatatanBerikutnya}
                  onChange={(e) => setFormCatatanBerikutnya(e.target.value)}
                  placeholder="Contoh: Pembahasan soal PR hal. 25 & ulangan harian bab 2."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <Input
                label="Pengingat / Catatan Tambahan (Opsional)"
                placeholder="Contoh: Siapkan alat peraga bangun ruang"
                value={formPengingat}
                onChange={(e) => setFormPengingat(e.target.value)}
              />

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
                  {showAddModal ? 'Simpan Jurnal' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus */}
      {showDeleteModal && activeJurnal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Hapus Jurnal Mengajar?
              </h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus catatan KBM pertemuan ke-{activeJurnal.pertemuanKe} ({activeJurnal.mapel})?
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
