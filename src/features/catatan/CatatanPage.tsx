import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { catatanRepo } from './catatanRepository';
import type { CatatanData, UlangiPengingat } from './catatanSchema';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Circle,
  Calendar,
  Repeat,
  AlertCircle,
  X,
  Check,
  Search,
} from 'lucide-react';

export const CatatanPage: React.FC = () => {
  const [catatanList, setCatatanList] = useState<CatatanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'aktif' | 'selesai'>('aktif');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeCatatan, setActiveCatatan] = useState<CatatanData | null>(null);

  // Form states
  const [formJudul, setFormJudul] = useState('');
  const [formTeks, setFormTeks] = useState('');
  const [formWaktu, setFormWaktu] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [formUlangi, setFormUlangi] = useState<UlangiPengingat>('sekali');
  const [formPrioritas, setFormPrioritas] = useState<'normal' | 'penting'>('normal');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const all = await catatanRepo.getAll();
      setCatatanList(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCatatan = useMemo(() => {
    return catatanList.filter((c) => {
      const matchFilter =
        filterStatus === 'semua'
          ? true
          : filterStatus === 'aktif'
          ? !c.selesai
          : c.selesai;
      const matchSearch =
        !searchQuery.trim() ||
        c.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teks.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [catatanList, filterStatus, searchQuery]);

  const handleToggleSelesai = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await catatanRepo.toggleSelesai(id);
      setCatatanList((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast(updated.selesai ? 'Catatan ditandai selesai' : 'Catatan diaktifkan kembali');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengubah status');
    }
  };

  const handleOpenAdd = () => {
    setFormJudul('');
    setFormTeks('');
    const now = new Date();
    setFormWaktu(now.toISOString().slice(0, 16));
    setFormUlangi('sekali');
    setFormPrioritas('normal');
    setShowAddModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim()) return;

    try {
      await catatanRepo.create({
        judul: formJudul.trim(),
        teks: formTeks.trim(),
        waktu: formWaktu,
        ulangi: formUlangi,
        prioritas: formPrioritas,
        selesai: false,
      });
      await loadData();
      setShowAddModal(false);
      showToast('Catatan pengingat berhasil disimpan');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyimpan catatan');
    }
  };

  const handleOpenEdit = (c: CatatanData) => {
    setActiveCatatan(c);
    setFormJudul(c.judul);
    setFormTeks(c.teks);
    setFormWaktu(c.waktu);
    setFormUlangi(c.ulangi);
    setFormPrioritas(c.prioritas);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCatatan || !formJudul.trim()) return;

    try {
      await catatanRepo.update(activeCatatan.id, {
        judul: formJudul.trim(),
        teks: formTeks.trim(),
        waktu: formWaktu,
        ulangi: formUlangi,
        prioritas: formPrioritas,
      });
      await loadData();
      setShowEditModal(false);
      showToast('Perubahan catatan berhasil disimpan');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengubah catatan');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus catatan ini?')) {
      try {
        await catatanRepo.delete(id);
        setCatatanList((prev) => prev.filter((c) => c.id !== id));
        showToast('Catatan telah dihapus');
      } catch (err: unknown) {
        alert((err as Error).message || 'Gagal menghapus');
      }
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat catatan...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto pb-10 animate-in fade-in duration-300">
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
            <ClipboardList className="w-7 h-7 text-brand-600" />
            Catatan & Pengingat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agenda penting guru, tugas administratif, dan pengingat harian/mingguan
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Catatan
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl self-start">
          {[
            { key: 'aktif', label: 'Belum Selesai' },
            { key: 'selesai', label: 'Selesai' },
            { key: 'semua', label: 'Semua' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterStatus(f.key as typeof filterStatus)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === f.key
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Catatan List */}
      {filteredCatatan.length === 0 ? (
        <Card className="text-center py-12 px-4 space-y-3 border-dashed">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {filterStatus === 'selesai'
              ? 'Belum ada catatan yang ditandai selesai'
              : 'Tidak ada catatan agenda yang aktif'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Gunakan modul ini untuk mencatat persiapan materi, jadwal rapat guru, atau tindak lanjut siswa.
          </p>
          <Button size="sm" variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Catatan Baru
          </Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredCatatan.map((c) => (
            <Card
              key={c.id}
              onClick={() => handleOpenEdit(c)}
              className={`p-4 border transition-all cursor-pointer hover:border-brand-500 ${
                c.selesai ? 'opacity-60 bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelesai(c.id, e)}
                    className="mt-0.5 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    {c.selesai ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-bold text-sm text-slate-900 dark:text-white ${
                          c.selesai ? 'line-through text-slate-500 dark:text-slate-400' : ''
                        }`}
                      >
                        {c.judul}
                      </h3>
                      {c.prioritas === 'penting' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold">
                          <AlertCircle className="w-3 h-3" /> Penting
                        </span>
                      )}
                      <Badge variant="neutral" className="text-[10px]">
                        <Repeat className="w-3 h-3 mr-0.5" />
                        {c.ulangi === 'sekali'
                          ? 'Sekali'
                          : c.ulangi === 'harian'
                          ? 'Harian'
                          : 'Mingguan'}
                      </Badge>
                    </div>

                    {c.teks && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {c.teks}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{c.waktu.replace('T', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(c);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
                    title="Ubah Catatan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus Catatan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: Tambah / Edit Catatan */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-600" />
                {showAddModal ? 'Tambah Catatan Baru' : 'Ubah Catatan'}
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
              <Input
                label="Judul Catatan / Agenda"
                placeholder="Contoh: Rapat Dewan Guru Jam 13.00"
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value)}
                autoFocus
                required
              />

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Rincian Catatan (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={formTeks}
                  onChange={(e) => setFormTeks(e.target.value)}
                  placeholder="Ketik rincian agenda atau materi penting..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <Input
                label="Waktu / Tanggal Pengingat"
                type="datetime-local"
                value={formWaktu}
                onChange={(e) => setFormWaktu(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Pengulangan
                  </label>
                  <select
                    value={formUlangi}
                    onChange={(e) => setFormUlangi(e.target.value as UlangiPengingat)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="sekali">Sekali Saja</option>
                    <option value="harian">Harian (Tiap Hari)</option>
                    <option value="mingguan">Mingguan</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Prioritas
                  </label>
                  <select
                    value={formPrioritas}
                    onChange={(e) => setFormPrioritas(e.target.value as 'normal' | 'penting')}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="penting">Penting</option>
                  </select>
                </div>
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
                  {showAddModal ? 'Simpan Catatan' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
