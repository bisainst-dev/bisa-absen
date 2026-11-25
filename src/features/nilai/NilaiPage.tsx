import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { nilaiRepo } from './nilaiRepository';
import { kelasRepo } from '../siswa/kelasRepository';
import { siswaRepo } from '../siswa/siswaRepository';
import { useProfilStore } from '../../stores/useProfilStore';
import {
  hitungRataRataSiswa,
  hitungRataRataKelas,
  type NilaiData,
  type EntriNilaiSiswa,
} from './nilaiSchema';
import type { KelasData } from '../siswa/kelasSchema';
import type { SiswaData } from '../siswa/siswaSchema';
import {
  Award,
  Plus,
  Trash2,
  X,
  Check,
  Search,
  Calculator,
  Save,
  Keyboard,
} from 'lucide-react';

export const NilaiPage: React.FC = () => {
  const { profil } = useProfilStore();
  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaData[]>([]);
  const [columns, setColumns] = useState<NilaiData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Local grid values: map of `${columnId}_${siswaId}` -> string
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Modal tambah kolom
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [formColJenis, setFormColJenis] = useState<'Tugas' | 'PH'>('Tugas');
  const [formColKode, setFormColKode] = useState('T1');
  const [formColJudul, setFormColJudul] = useState('');

  // Modal hapus kolom
  const [colToDelete, setColToDelete] = useState<NilaiData | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Grid cell input refs for keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

        const initialKelasId = kList[0]?.id || '';
        const initialMapel =
          profil?.mapel && profil.mapel.length > 0 ? profil.mapel[0] : 'Matematika';
        const initialSem = profil?.semester || 'Ganjil';
        const initialTP = profil?.tahunPelajaran || '2026/2027';

        setSelectedKelasId(initialKelasId);
        setSelectedMapel(initialMapel);
        setSelectedSemester(initialSem);
        setSelectedTahunPelajaran(initialTP);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [profil]);

  // Load columns when filter changes
  useEffect(() => {
    if (!selectedKelasId || !selectedMapel || !selectedSemester || !selectedTahunPelajaran) return;

    async function loadCols() {
      try {
        const cols = await nilaiRepo.getByFilter(
          selectedKelasId,
          selectedMapel,
          selectedSemester,
          selectedTahunPelajaran
        );
        setColumns(cols);

        // Populate local scoreInputs
        const map: Record<string, string> = {};
        for (const col of cols) {
          for (const entri of col.entri) {
            map[`${col.id}_${entri.siswaId}`] =
              entri.nilai !== null && entri.nilai !== undefined ? String(entri.nilai) : '';
          }
        }
        setScoreInputs(map);
      } catch (err) {
        console.error(err);
      }
    }
    loadCols();
  }, [selectedKelasId, selectedMapel, selectedSemester, selectedTahunPelajaran]);

  // Siswa in current class
  const classStudents = useMemo(() => {
    return siswaList.filter((s) => s.kelasId === selectedKelasId);
  }, [siswaList, selectedKelasId]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter((s) => s.nama.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  // Calculate Rata-rata per Siswa
  const studentAverages = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const siswa of classStudents) {
      const scores: (number | null)[] = columns.map((col) => {
        const key = `${col.id}_${siswa.id}`;
        const raw = scoreInputs[key];
        if (raw === undefined || raw === '') return null;
        const num = parseFloat(raw);
        return isNaN(num) ? null : num;
      });
      map.set(siswa.id, hitungRataRataSiswa(scores));
    }
    return map;
  }, [classStudents, columns, scoreInputs]);

  // Class Average
  const classAverage = useMemo(() => {
    const avgs = Array.from(studentAverages.values());
    return hitungRataRataKelas(avgs);
  }, [studentAverages]);

  // Handle cell value change
  const handleScoreChange = (colId: string, siswaId: string, value: string) => {
    // Only accept numeric 0-100 or empty
    if (value !== '') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) return;
    }
    setScoreInputs((prev) => ({
      ...prev,
      [`${colId}_${siswaId}`]: value,
    }));
  };

  // Keyboard navigation handler: Enter / Down Arrow -> next student, Up Arrow -> prev student
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    colId: string,
    currentStudentIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentStudentIndex + 1;
      if (nextIndex < filteredStudents.length) {
        const nextSiswaId = filteredStudents[nextIndex].id;
        inputRefs.current[`${colId}_${nextSiswaId}`]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentStudentIndex - 1;
      if (prevIndex >= 0) {
        const prevSiswaId = filteredStudents[prevIndex].id;
        inputRefs.current[`${colId}_${prevSiswaId}`]?.focus();
      }
    }
  };

  // Save all current score inputs to Dexie
  const handleSaveAllScores = async () => {
    if (columns.length === 0) return;
    setIsSaving(true);
    try {
      for (const col of columns) {
        const entries: EntriNilaiSiswa[] = classStudents.map((s) => {
          const raw = scoreInputs[`${col.id}_${s.id}`];
          const val = raw !== undefined && raw !== '' ? Number(raw) : null;
          return {
            siswaId: s.id,
            nilai: val !== null && !isNaN(val) ? val : null,
          };
        });
        await nilaiRepo.saveBatchScore(col.id, entries);
      }
      showToast('Semua nilai berhasil disimpan!');
    } catch (e: unknown) {
      console.error(e);
      alert('Gagal menyimpan nilai');
    } finally {
      setIsSaving(false);
    }
  };

  // Open modal tambah kolom
  const handleOpenAddCol = () => {
    const tugasCount = columns.filter((c) => c.jenis === 'Tugas').length;
    const phCount = columns.filter((c) => c.jenis === 'PH').length;

    if (formColJenis === 'Tugas') {
      setFormColKode(`T${tugasCount + 1}`);
    } else {
      setFormColKode(`PH${phCount + 1}`);
    }
    setFormColJudul('');
    setShowAddColModal(true);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formColKode.trim()) return;

    try {
      const created = await nilaiRepo.createColumn({
        kelasId: selectedKelasId,
        mapel: selectedMapel,
        semester: selectedSemester,
        tahunPelajaran: selectedTahunPelajaran,
        jenis: formColJenis,
        kode: formColKode.trim(),
        judul: formColJudul.trim(),
        entri: classStudents.map((s) => ({ siswaId: s.id, nilai: null })),
      });

      setColumns([...columns, created]);
      setShowAddColModal(false);
      showToast(`Kolom ${created.kode} berhasil ditambahkan`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menambahkan kolom nilai');
    }
  };

  const handleDeleteColumn = async () => {
    if (!colToDelete) return;
    try {
      await nilaiRepo.deleteColumn(colToDelete.id);
      setColumns(columns.filter((c) => c.id !== colToDelete.id));
      setColToDelete(null);
      showToast(`Kolom ${colToDelete.kode} telah dihapus`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus kolom');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Memuat modul penilaian...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-10 animate-in fade-in duration-300">
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
            <Award className="w-7 h-7 text-brand-600" />
            Penilaian Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tabel input cepat nilai Tugas (T1..Tn) dan PH (PH1..PHn) dengan rata-rata otomatis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenAddCol}>
            <Plus className="w-4 h-4 mr-1.5 text-brand-600" />
            Tambah Kolom Nilai
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={handleSaveAllScores}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Simpan Nilai
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900 border space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kelas</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            >
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mapel</label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            >
              {profil?.mapel?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tahun Pelajaran</label>
            <input
              type="text"
              value={selectedTahunPelajaran}
              onChange={(e) => setSelectedTahunPelajaran(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Info Keyboard shortcut & Class stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Keyboard className="w-4 h-4 text-brand-600" />
            <span>Tekan <strong>Enter</strong> atau <strong>↓</strong> untuk pindah ke baris siswa berikutnya.</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="brand">
              Rata-rata Kelas: {classAverage !== null ? classAverage : '-'}
            </Badge>
            <Badge variant="neutral">
              {columns.length} Kolom Penilaian
            </Badge>
          </div>
        </div>
      </Card>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari nama siswa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Grid Nilai Table */}
      {classStudents.length === 0 ? (
        <Card className="text-center py-12 px-4 space-y-2 border-dashed">
          <Award className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Belum ada data siswa di kelas ini
          </h3>
          <p className="text-xs text-slate-500">
            Tambahkan siswa di menu Kelola Siswa terlebih dahulu.
          </p>
        </Card>
      ) : columns.length === 0 ? (
        <Card className="text-center py-12 px-4 space-y-3 border-dashed">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Belum ada kolom penilaian di semester ini
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Tambahkan kolom penilaian Tugas (T1, T2...) atau Penilaian Harian (PH1, PH2...) untuk mulai mengisi nilai.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={handleOpenAddCol}>
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Kolom Nilai Pertama
          </Button>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3 w-10 text-center font-bold text-slate-500">No</th>
                <th className="py-3 px-3 min-w-[180px] font-bold text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-100/95 dark:bg-slate-800/95 z-10">
                  Nama Siswa
                </th>

                {/* Kolom-kolom Nilai Dinamis */}
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="py-3 px-2 text-center min-w-[85px] font-extrabold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-black text-brand-600 dark:text-brand-400">
                        {col.kode}
                      </span>
                      <button
                        type="button"
                        onClick={() => setColToDelete(col)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                        title={`Hapus kolom ${col.kode}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {col.judul && (
                      <span className="block text-[10px] font-normal text-slate-400 truncate max-w-[80px]">
                        {col.judul}
                      </span>
                    )}
                  </th>
                ))}

                {/* Kolom Rata-rata Otomatis */}
                <th className="py-3 px-3 text-center min-w-[90px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-l border-emerald-200 dark:border-emerald-900">
                  Rata-rata
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((siswa, sIdx) => {
                const avg = studentAverages.get(siswa.id);
                return (
                  <tr
                    key={siswa.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                      {sIdx + 1}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 sticky left-0 bg-white/95 dark:bg-slate-900/95 z-10 truncate max-w-[200px]">
                      {siswa.nama}
                    </td>

                    {/* Input per Kolom Nilai */}
                    {columns.map((col) => {
                      const inputKey = `${col.id}_${siswa.id}`;
                      const val = scoreInputs[inputKey] ?? '';

                      return (
                        <td
                          key={col.id}
                          className="py-1.5 px-2 text-center border-l border-slate-100 dark:border-slate-800"
                        >
                          <input
                            ref={(el) => {
                              inputRefs.current[inputKey] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            value={val}
                            onChange={(e) => handleScoreChange(col.id, siswa.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, col.id, sIdx)}
                            placeholder="-"
                            className="w-14 text-center py-1.5 px-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                          />
                        </td>
                      );
                    })}

                    {/* Nilai Rata-rata Siswa */}
                    <td className="py-2 px-3 text-center font-extrabold text-sm border-l border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
                      {avg !== null && avg !== undefined ? (
                        <span
                          className={
                            avg >= 75
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : avg >= 60
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {avg}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Table: Rata-rata Kelas */}
            <tfoot>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                <td colSpan={2} className="py-3 px-4 text-right text-slate-700 dark:text-slate-200">
                  Rata-rata Kelas :
                </td>
                {columns.map((col) => {
                  const colScores = classStudents.map((s) => {
                    const raw = scoreInputs[`${col.id}_${s.id}`];
                    return raw ? Number(raw) : null;
                  });
                  const colAvg = hitungRataRataSiswa(colScores);
                  return (
                    <td
                      key={col.id}
                      className="py-3 px-2 text-center text-brand-700 dark:text-brand-300 font-extrabold border-l border-slate-200 dark:border-slate-700"
                    >
                      {colAvg !== null ? colAvg : '-'}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-300 font-black text-sm bg-emerald-100/60 dark:bg-emerald-950/60 border-l border-emerald-300 dark:border-emerald-800">
                  {classAverage !== null ? classAverage : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* MODAL 1: Tambah Kolom Nilai */}
      {showAddColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-600" />
                Tambah Kolom Penilaian
              </h3>
              <button
                type="button"
                onClick={() => setShowAddColModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateColumn} className="space-y-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Kategori Penilaian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormColJenis('Tugas');
                      const count = columns.filter((c) => c.jenis === 'Tugas').length;
                      setFormColKode(`T${count + 1}`);
                    }}
                    className={`py-2 rounded-2xl border text-xs font-bold transition-all ${
                      formColJenis === 'Tugas'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Tugas (T1..Tn)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormColJenis('PH');
                      const count = columns.filter((c) => c.jenis === 'PH').length;
                      setFormColKode(`PH${count + 1}`);
                    }}
                    className={`py-2 rounded-2xl border text-xs font-bold transition-all ${
                      formColJenis === 'PH'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-2 ring-brand-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Penilaian Harian (PH1..PHn)
                  </button>
                </div>
              </div>

              <Input
                label="Kode Kolom"
                value={formColKode}
                onChange={(e) => setFormColKode(e.target.value)}
                placeholder="Contoh: T1 atau PH2"
                required
              />

              <Input
                label="Keterangan / Materi (Opsional)"
                value={formColJudul}
                onChange={(e) => setFormColJudul(e.target.value)}
                placeholder="Contoh: Bangun Datar"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowAddColModal(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Buat Kolom
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Hapus Kolom Nilai */}
      {colToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Hapus Kolom {colToDelete.kode}?
              </h3>
              <p className="text-xs text-slate-500">
                Nilai yang sudah dimasukkan pada kolom ini akan diarsipkan.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setColToDelete(null)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteColumn}>
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
