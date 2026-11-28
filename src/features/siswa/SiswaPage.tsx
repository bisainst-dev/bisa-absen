import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { kelasRepo } from './kelasRepository';
import { siswaRepo } from './siswaRepository';
import { syncEngine } from '../../services/sync/syncEngine';
import type { KelasData } from './kelasSchema';
import type { SiswaData, JenisKelamin } from './siswaSchema';
import {
  parseSiswaExcel,
  generateExcelTemplate,
  type ParseSiswaExcelResult,
} from '../../services/import/siswaExcelParser';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Edit2,
  Trash2,
  ArrowRightLeft,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';

export const SiswaPage: React.FC = () => {
  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaData[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  // Selected item for action
  const [activeSiswa, setActiveSiswa] = useState<SiswaData | null>(null);

  // Form states
  const [formNama, setFormNama] = useState('');
  const [formJk, setFormJk] = useState<JenisKelamin>('L');
  const [formKelasId, setFormKelasId] = useState('');
  const [formNis, setFormNis] = useState('');
  const [formNewClassLabel, setFormNewClassLabel] = useState('');

  // Import state
  const [importResult, setImportResult] = useState<ParseSiswaExcelResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const [allKelas, allSiswa] = await Promise.all([
        kelasRepo.getAll(),
        siswaRepo.getAll(),
      ]);
      setKelasList(allKelas);
      setSiswaList(allSiswa);

      if (allKelas.length > 0 && selectedKelasId === 'all') {
        setFormKelasId(allKelas[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsub = syncEngine.subscribe((state) => {
      if (state === 'synced' || state === 'idle') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Filtered siswa
  const filteredSiswa = useMemo(() => {
    return siswaList.filter((s) => {
      const matchKelas = selectedKelasId === 'all' || s.kelasId === selectedKelasId;
      const matchSearch =
        searchQuery.trim() === '' ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery));
      return matchKelas && matchSearch;
    });
  }, [siswaList, selectedKelasId, searchQuery]);

  // Statistik
  const stats = useMemo(() => {
    const total = filteredSiswa.length;
    const laki = filteredSiswa.filter((s) => s.jenisKelamin === 'L').length;
    const perempuan = filteredSiswa.filter((s) => s.jenisKelamin === 'P').length;
    return { total, laki, perempuan };
  }, [filteredSiswa]);

  // Kelas map untuk lookup cepat nama kelas
  const kelasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const k of kelasList) {
      map.set(k.id, k.label);
    }
    return map;
  }, [kelasList]);

  // Handlers
  const handleOpenAdd = () => {
    setFormNama('');
    setFormJk('L');
    setFormNis('');
    setFormKelasId(selectedKelasId !== 'all' ? selectedKelasId : kelasList[0]?.id || '');
    setShowAddModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;
    if (!formKelasId) {
      alert('Pilih kelas terlebih dahulu');
      return;
    }

    try {
      await siswaRepo.create({
        nama: formNama,
        jenisKelamin: formJk,
        kelasId: formKelasId,
        nis: formNis,
      });
      await loadData();
      setShowAddModal(false);
      showToast(`Siswa "${formNama}" berhasil ditambahkan`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menambahkan siswa');
    }
  };

  const handleOpenEdit = (siswa: SiswaData) => {
    setActiveSiswa(siswa);
    setFormNama(siswa.nama);
    setFormJk(siswa.jenisKelamin);
    setFormKelasId(siswa.kelasId);
    setFormNis(siswa.nis || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSiswa || !formNama.trim()) return;

    try {
      await siswaRepo.update(activeSiswa.id, {
        nama: formNama,
        jenisKelamin: formJk,
        kelasId: formKelasId,
        nis: formNis,
      });
      await loadData();
      setShowEditModal(false);
      showToast('Perubahan data siswa berhasil disimpan');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengubah data siswa');
    }
  };

  const handleOpenMove = (siswa: SiswaData) => {
    setActiveSiswa(siswa);
    setFormKelasId(siswa.kelasId);
    setShowMoveModal(true);
  };

  const handleSaveMove = async () => {
    if (!activeSiswa || !formKelasId || formKelasId === activeSiswa.kelasId) {
      setShowMoveModal(false);
      return;
    }

    try {
      await siswaRepo.moveToClass(activeSiswa.id, formKelasId);
      await loadData();
      setShowMoveModal(false);
      const targetLabel = kelasMap.get(formKelasId) || '';
      showToast(`${activeSiswa.nama} dipindahkan ke kelas ${targetLabel}`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal memindahkan siswa');
    }
  };

  const handleOpenDelete = (siswa: SiswaData) => {
    setActiveSiswa(siswa);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!activeSiswa) return;
    try {
      await siswaRepo.delete(activeSiswa.id);
      await loadData();
      setShowDeleteModal(false);
      showToast(`Siswa "${activeSiswa.nama}" telah dihapus`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus siswa');
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNewClassLabel.trim()) return;
    try {
      const created = await kelasRepo.create({
        label: formNewClassLabel.trim(),
        tingkat: '',
        rombel: '',
        keterangan: '',
      });
      await loadData();
      setSelectedKelasId(created.id);
      setFormNewClassLabel('');
      setShowAddClassModal(false);
      showToast(`Kelas ${created.label} berhasil ditambahkan`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menambahkan kelas');
    }
  };

  // Excel handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const targetKelas = selectedKelasId !== 'all' ? selectedKelasId : undefined;
      const res = parseSiswaExcel(buffer, kelasList, targetKelas);
      setImportResult(res);
    } catch (err: unknown) {
      console.error(err);
      alert('Gagal membaca berkas Excel. Pastikan format .xlsx atau .xls valid.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importResult || importResult.validItems.length === 0) return;
    setIsSavingImport(true);

    try {
      await siswaRepo.bulkCreate(
        importResult.validItems.map((item) => ({
          nama: item.nama,
          jenisKelamin: item.jenisKelamin,
          kelasId: item.kelasId,
        }))
      );
      await loadData();
      setShowImportModal(false);
      setImportResult(null);
      setImportFile(null);
      showToast(`Berhasil mengimpor ${importResult.validItems.length} siswa!`);
    } catch (err: unknown) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan data impor');
    } finally {
      setIsSavingImport(false);
    }
  };

  const handleDownloadTemplate = () => {
    const targetLabel =
      selectedKelasId !== 'all' ? kelasMap.get(selectedKelasId) || '7A' : '7A';
    generateExcelTemplate(targetLabel);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">
        Memuat data siswa...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-10 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-700/20 text-sm font-bold animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-600" />
            Kelola Siswa & Kelas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar murid per kelas, input manual, dan impor data via Excel
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportResult(null);
              setImportFile(null);
              setShowImportModal(true);
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-teal-600" />
            Impor Excel
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Filter Kelas Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedKelasId('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedKelasId === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-400'
          }`}
        >
          Semua Kelas ({siswaList.length})
        </button>

        {kelasList.map((k) => {
          const count = siswaList.filter((s) => s.kelasId === k.id).length;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setSelectedKelasId(k.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedKelasId === k.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-400'
              }`}
            >
              Kelas {k.label} ({count})
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAddClassModal(true)}
          className="px-3 py-2 rounded-2xl text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 hover:bg-brand-100 flex items-center gap-1 whitespace-nowrap"
          title="Tambah Rombel/Kelas Baru"
        >
          <Plus className="w-3.5 h-3.5" /> Kelas Baru
        </button>
      </div>

      {/* Ringkasan & Pencarian */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand" className="text-xs px-3 py-1">
              Total: {stats.total} Siswa
            </Badge>
            <Badge variant="neutral" className="text-xs px-3 py-1">
              Laki-laki (L): {stats.laki}
            </Badge>
            <Badge variant="neutral" className="text-xs px-3 py-1">
              Perempuan (P): {stats.perempuan}
            </Badge>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabel / List Siswa */}
        {filteredSiswa.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Belum ada siswa di kelas ini
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Ketuk tombol Tambah Siswa untuk input manual atau Impor Excel untuk memasukkan banyak siswa sekaligus.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-teal-600" /> Impor Excel
              </Button>
              <Button size="sm" variant="primary" onClick={handleOpenAdd}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Tambah Siswa
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSiswa.map((siswa, idx) => (
              <div
                key={siswa.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-slate-400 w-5 text-center">
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
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">{siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                      <span>•</span>
                      <span>Kelas {kelasMap.get(siswa.kelasId) || '-'}</span>
                      {siswa.nis && (
                        <>
                          <span>•</span>
                          <span>NIS: {siswa.nis}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenMove(siswa)}
                    className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Pindah Kelas"
                    aria-label={`Pindah kelas ${siswa.nama}`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(siswa)}
                    className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Ubah Siswa"
                    aria-label={`Ubah siswa ${siswa.nama}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(siswa)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Hapus Siswa"
                    aria-label={`Hapus siswa ${siswa.nama}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* MODAL 1: Tambah Siswa Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                Tambah Siswa Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <Input
                label="Nama Lengkap Siswa"
                placeholder="Contoh: Muhammad Rizky Pratama"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                autoFocus
                required
              />

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Jenis Kelamin <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormJk('L')}
                    className={`py-2.5 rounded-2xl border text-sm font-bold transition-all ${
                      formJk === 'L'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Laki-laki (L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormJk('P')}
                    className={`py-2.5 rounded-2xl border text-sm font-bold transition-all ${
                      formJk === 'P'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Perempuan (P)
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Kelas <span className="text-rose-500">*</span>
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

              <Input
                label="NIS / Nomor Induk (Opsional)"
                placeholder="Contoh: 20240101"
                value={formNis}
                onChange={(e) => setFormNis(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Simpan Siswa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Impor Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                Impor Data Siswa dari Excel (.xlsx)
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Section */}
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-teal-900 dark:text-teal-200">
                  Unduh Format Template
                </p>
                <p className="text-teal-700 dark:text-teal-400 mt-0.5">
                  Gunakan template resmi agar kolom Nama, Jenis Kelamin (L/P), dan Kelas sesuai.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="shrink-0 bg-white dark:bg-slate-900"
              >
                <Download className="w-4 h-4 mr-1 text-teal-600" /> Unduh
              </Button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center space-y-2 hover:border-brand-500 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-brand-600" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {importFile ? importFile.name : 'Pilih file Excel (.xlsx / .xls)'}
                </p>
                <p className="text-xs text-slate-500">
                  Mendukung hingga ratusan siswa dengan validasi instan
                </p>
              </div>
              <label className="inline-block mt-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-200">
                  Pilih Berkas
                </span>
              </label>
            </div>

            {isParsing && (
              <div className="text-center py-4 text-xs font-bold text-brand-600 flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Membaca dan memvalidasi baris...
              </div>
            )}

            {/* Parse Result Preview */}
            {importResult && (
              <div className="space-y-3 pt-2 text-left">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Badge variant="success">
                    {importResult.validItems.length} Siswa Siap Diimpor
                  </Badge>
                  {importResult.errors.length > 0 && (
                    <Badge variant="danger">
                      {importResult.errors.length} Baris Bermasalah (Dilewati)
                    </Badge>
                  )}
                </div>

                {/* Error log if any */}
                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-1 text-xs text-rose-700 dark:text-rose-300">
                    <p className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5" /> Laporan Baris yang Dilewati:
                    </p>
                    {importResult.errors.map((err, i) => (
                      <p key={i}>
                        • Baris {err.baris}: {err.pesan}
                      </p>
                    ))}
                  </div>
                )}

                {/* Preview Valid List */}
                {importResult.validItems.length > 0 && (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 text-xs">
                    {importResult.validItems.slice(0, 15).map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center px-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {item.nama}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                            {item.jenisKelamin}
                          </span>
                          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                            {item.kelasLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                    {importResult.validItems.length > 15 && (
                      <p className="text-center py-1 text-slate-400 text-[10px]">
                        dan {importResult.validItems.length - 15} siswa lainnya...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!importResult || importResult.validItems.length === 0}
                isLoading={isSavingImport}
                onClick={handleCommitImport}
              >
                Simpan {importResult?.validItems.length || 0} Siswa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Siswa */}
      {showEditModal && activeSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-600" />
                Ubah Data Siswa
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Input
                label="Nama Lengkap Siswa"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormJk('L')}
                    className={`py-2.5 rounded-2xl border text-sm font-bold transition-all ${
                      formJk === 'L'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Laki-laki (L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormJk('P')}
                    className={`py-2.5 rounded-2xl border text-sm font-bold transition-all ${
                      formJk === 'P'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Perempuan (P)
                  </button>
                </div>
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

              <Input
                label="NIS / Nomor Induk (Opsional)"
                value={formNis}
                onChange={(e) => setFormNis(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Pindah Kelas */}
      {showMoveModal && activeSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-brand-600" />
                Pindah Kelas
              </h3>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400">
              Pindahkan siswa <strong className="text-slate-900 dark:text-white">{activeSiswa.nama}</strong> dari Kelas{' '}
              <strong className="text-slate-900 dark:text-white">{kelasMap.get(activeSiswa.kelasId)}</strong> ke:
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Kelas Tujuan
              </label>
              <select
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-brand-500"
                value={formKelasId}
                onChange={(e) => setFormKelasId(e.target.value)}
              >
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMoveModal(false)}
              >
                Batal
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveMove}>
                Pindahkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Hapus Siswa (Konfirmasi) */}
      {showDeleteModal && activeSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Hapus Data Siswa?
              </h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data <strong>{activeSiswa.nama}</strong>? Data akan diarsipkan dengan aman.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmDelete}
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Tambah Kelas Baru */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Tambah Kelas / Rombel Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              <Input
                label="Nama / Label Kelas"
                placeholder="Contoh: 7C, 8A, atau X IPA 3"
                value={formNewClassLabel}
                onChange={(e) => setFormNewClassLabel(e.target.value)}
                autoFocus
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddClassModal(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Tambah Kelas
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
