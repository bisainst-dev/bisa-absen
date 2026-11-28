import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { backupService, type ValidationResult } from '../../services/backup/backupService';
import { pengaturanRepo } from '../pengaturan/repository';
import { genericRepo } from '../../db/dexie';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Check,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export const BackupPage: React.FC = () => {
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Modals
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadStatus = async () => {
    try {
      const p = await pengaturanRepo.getPengaturan();
      setLastBackup(p.lastBackupDate);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isStale = backupService.isBackupStale(lastBackup, 7);

  const daysSince = lastBackup
    ? Math.floor((Date.now() - lastBackup) / (1000 * 60 * 60 * 24))
    : null;

  // Ekspor Cadangan
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const filename = await backupService.downloadBackupFile();
      await loadStatus();
      showToast(`Berkas ${filename} berhasil diunduh!`);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal membuat cadangan');
    } finally {
      setIsExporting(false);
    }
  };

  // Pilih Berkas untuk Dipulihkan
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const val = backupService.validateBackupJson(text);
      setValidation(val);

      if (!val.valid) {
        alert(val.pesanError || 'Berkas cadangan tidak valid');
      } else {
        setShowConfirmRestoreModal(true);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal membaca berkas. Pastikan berkas berformat .backup.json valid.');
    }
  };

  // Eksekusi Pulihkan Data
  const handleExecuteRestore = async () => {
    if (!validation?.backupData) return;
    setIsRestoring(true);

    try {
      await backupService.restoreBackup(validation.backupData, true);
      await loadStatus();
      setShowConfirmRestoreModal(false);
      setValidation(null);
      showToast('Semua data berhasil dipulihkan dari berkas cadangan!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal memulihkan data');
    } finally {
      setIsRestoring(false);
    }
  };

  // Reset Semua Data
  const handleResetDatabase = async () => {
    try {
      await genericRepo.clearDatabase();
      showToast('Seluruh data lokal telah dibersihkan');
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 1000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mereset database');
    }
  };

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
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-7 h-7 text-brand-600" />
          Cadangan & Pulihkan Data
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Simpan seluruh data absensi, nilai, dan jurnal ke file berekstensi .backup.json (100% aman & terenkripsi checksum)
        </p>
      </div>

      {/* Status Cadangan Banner */}
      <Card
        className={`p-5 border transition-colors ${isStale
          ? 'border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20'
          : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
          }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${isStale
                ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                }`}
            >
              {isStale ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isStale ? 'Peringatan: Perlu Dicadangkan' : 'Status Cadangan: Terlindungi'}
                </h3>
                <Badge variant={isStale ? 'warning' : 'success'}>
                  {lastBackup ? `${daysSince} Hari Lalu` : 'Belum Pernah'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isStale
                  ? 'Cadangan terakhir telah lebih dari 7 hari yang lalu. Unduh file cadangan terbaru agar data aman jika ganti perangkat.'
                  : 'Data Anda telah dicadangkan secara berkala. Seluruh rekaman aman tersimpan.'}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            isLoading={isExporting}
            onClick={handleExportBackup}
            className="shrink-0 w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-1.5" /> Cadangkan Sekarang
          </Button>
        </div>
      </Card>

      {/* Grid: 2 Card Aksi (Cadangkan & Pulihkan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KOTAK 1: EKSPOR CADANGAN */}
        <Card className="p-5 space-y-4 border hover:border-brand-500 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Ekspor Cadangan (.backup.json)
              </h3>
              <p className="text-xs text-slate-500">Unduh seluruh rekaman database ke 1 file</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <FileCheck className="w-4 h-4 text-brand-600" />
              Isi File Cadangan:
            </div>
            <p>• Data Profil Guru, NIP, & Sekolah</p>
            <p>• Daftar Seluruh Siswa & Rombel Kelas</p>
            <p>• Jadwal Mingguan & Catatan Pengingat</p>
            <p>• Riwayat Seluruh Sesi Absensi & Jurnal</p>
            <p>• Grid Penilaian Tugas & PH Beserta Rata-rata</p>
            <p>• Ekstrakurikuler, Les, & Anggota Lintas Kelas</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            isLoading={isExporting}
            onClick={handleExportBackup}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-1.5" /> Unduh Berkas .backup.json
          </Button>
        </Card>

        {/* KOTAK 2: PULIHKAN DARI FILE */}
        <Card className="p-5 space-y-4 border hover:border-brand-500 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Pulihkan Data (Restore)
              </h3>
              <p className="text-xs text-slate-500">Unggah berkas .backup.json yang sudah ada</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Keamanan Pemulihan:
            </div>
            <p>• Sistem otomatis memverifikasi keaslian checksum</p>
            <p>• Menolak berkas yang rusak atau bukan cadangan Esduta Gate</p>
            <p>• Menampilkan konfirmasi ringkasan data sebelum menimpa</p>
          </div>

          <label className="block w-full">
            <input
              type="file"
              accept=".json,.backup.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm shadow-brand-600/20">
              <Upload className="w-4 h-4 mr-1.5" /> Pilih Berkas Cadangan
            </span>
          </label>
        </Card>
      </div>

      {/* Zona Bahaya: Hapus / Reset Semua Data */}
      <Card className="p-4 border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200">
                Bersihkan & Reset Seluruh Data Lokal
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Menghapus seluruh rekaman dari HP Anda dan mengembalikan aplikasi ke kondisi awal.
              </p>
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowResetModal(true)}
            className="shrink-0"
          >
            Reset Semua Data
          </Button>
        </div>
      </Card>

      {/* MODAL 1: Konfirmasi Pemulihan Cadangan */}
      {showConfirmRestoreModal && validation?.backupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Konfirmasi Pemulihan Data
              </h3>
              <p className="text-xs text-slate-500">
                Berkas cadangan valid dan terverifikasi secara aman.
              </p>
            </div>

            {/* Ringkasan Isi Berkas */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tanggal Dibuat:</span>
                <span className="font-bold">
                  {new Date(validation.backupData.createdAt).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Rekaman:</span>
                <span className="font-bold text-brand-600">
                  {validation.backupData.summary.totalRecords} Data
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status Checksum:</span>
                <span className="font-bold text-emerald-600">Lolos Verifikasi ({validation.backupData.checksum.slice(0, 14)}...)</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
              <strong>Peringatan:</strong> Memulihkan cadangan akan menimpa data yang saat ini ada di perangkat Anda.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowConfirmRestoreModal(false);
                  setValidation(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isRestoring}
                onClick={handleExecuteRestore}
              >
                Ya, Pulihkan Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Konfirmasi Reset Database */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Hapus Seluruh Data?
              </h3>
              <p className="text-xs text-slate-500">
                Aksi ini bersifat permanen. Seluruh profil guru, murid, jadwal, absensi, dan nilai akan dihapus dari peramban ini.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowResetModal(false)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleResetDatabase}>
                Ya, Bersihkan Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
