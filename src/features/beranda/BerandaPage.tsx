import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useProfilStore } from '../../stores/useProfilStore';
import { getDinamisGreeting, getWaktuSapaan } from '../../lib/academicYear';
import { pengaturanRepo } from '../pengaturan/repository';
import { jadwalRepo } from '../jadwal/jadwalRepository';
import { kelasRepo } from '../siswa/kelasRepository';
import { catatanRepo } from '../catatan/catatanRepository';
import { reminderService, type MissedReminder } from '../../services/reminder/reminderService';
import type { JadwalData } from '../jadwal/jadwalSchema';
import type { KelasData } from '../siswa/kelasSchema';
import {
  Calendar,
  UserCheck,
  BookOpen,
  Users,
  Award,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  BellRing,
  X,
} from 'lucide-react';

export const BerandaPage: React.FC = () => {
  const { profil } = useProfilStore();
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [todayJadwal, setTodayJadwal] = useState<JadwalData[]>([]);
  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [missedReminders, setMissedReminders] = useState<MissedReminder[]>([]);
  const [isMissedDismissed, setIsMissedDismissed] = useState(false);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Minggu, 1=Senin..
  const todayDayIndex = dayOfWeek === 0 ? 7 : dayOfWeek;

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [p, j, k, c] = await Promise.all([
          pengaturanRepo.getPengaturan(),
          jadwalRepo.getByHari(todayDayIndex),
          kelasRepo.getAll(),
          catatanRepo.getAll(),
        ]);
        setLastBackup(p.lastBackupDate);
        setTodayJadwal(j);
        setKelasList(k);

        const kMap = new Map<string, string>();
        for (const item of k) kMap.set(item.id, item.label);
        const missed = reminderService.getMissedReminders(j, c, kMap);
        setMissedReminders(missed);
      } catch (e) {
        console.error(e);
      }
    }
    loadDashboardData();
  }, [todayDayIndex]);

  const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayOfWeek];
  const tanggalFormat = `${hariIndo}, ${today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const sapaan = getDinamisGreeting(profil?.namaPanggilan);
  const waktu = getWaktuSapaan();
  const iconsWaktu = {
    Pagi: '☀️',
    Siang: '🌤️',
    Sore: '🌅',
    Malam: '🌙',
  };

  const kelasMap = new Map<string, string>();
  for (const k of kelasList) kelasMap.set(k.id, k.label);

  // Status cadangan perhitungan hari
  const now = Date.now();
  const daysSinceBackup = lastBackup ? Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24)) : null;
  const isBackupStale = daysSinceBackup === null || daysSinceBackup > 7;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Sapaan Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-teal-700 text-white p-6 shadow-lg shadow-brand-700/20">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-brand-100 text-sm font-semibold">
            <span>{iconsWaktu[waktu]}</span>
            <span>{tanggalFormat}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {sapaan}
          </h1>
          <p className="text-brand-100 text-sm max-w-md pt-1">
            Siap mendampingi administrasi mengajar Anda hari ini dengan mudah dan cepat.
          </p>
        </div>

        {/* Decorative circle */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Pengingat Terlewat (Missed Reminders) */}
      {!isMissedDismissed && missedReminders.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Pengingat Terlewat ({missedReminders.length})
                </h3>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Sesi atau agenda guru yang jamnya telah terlewat hari ini
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMissedDismissed(true)}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 p-1 rounded-lg"
              title="Tutup pengingat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {missedReminders.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-amber-900/30 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span>{item.judul}</span>
                    <Badge variant="warning">{item.waktuSeharusnya}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.keterangan}</p>
                </div>
                {item.tipe === 'jadwal' ? (
                  <Link to="/absensi">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                      Catat Absen
                    </Button>
                  </Link>
                ) : (
                  <Link to="/catatan">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                      Buka Catatan
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pintasan Aksi Cepat */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/absensi"
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Catat Absensi
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Hadir, Sakit, Izin, Alfa
            </span>
          </Link>

          <Link
            to="/jurnal"
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Tulis Jurnal
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Materi & catatan kelas
            </span>
          </Link>

          <Link
            to="/nilai"
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Input Nilai
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Tugas & Penilaian Harian
            </span>
          </Link>

          <Link
            to="/siswa"
            className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Kelola Siswa
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar & Impor Excel
            </span>
          </Link>
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-600" />
            Jadwal Mengajar Hari Ini ({todayJadwal.length} Sesi)
          </h2>
          <Link
            to="/jadwal"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
          >
            Kelola Jadwal <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todayJadwal.length === 0 ? (
          <Card className="text-center py-8 px-4 space-y-3 border-dashed">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                Tidak ada jadwal mengajar pada hari {hariIndo}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Atur jadwal mata pelajaran mingguan Anda agar sesi mengajar otomatis muncul di sini.
              </p>
            </div>
            <Link to="/jadwal" className="inline-block pt-1">
              <Button size="sm" variant="secondary">
                <PlusCircle className="w-4 h-4 mr-1.5" /> Atur Jadwal Mengajar
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {todayJadwal.map((jadwal) => (
              <Card
                key={jadwal.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border hover:border-brand-500 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex flex-col items-center justify-center font-bold shrink-0">
                    <Clock className="w-4 h-4 mb-0.5 text-brand-600" />
                    <span className="text-[10px]">{jadwal.jamMulai}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {jadwal.mapel}
                      </span>
                      <Badge variant="brand">Kelas {kelasMap.get(jadwal.kelasId) || '-'}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {jadwal.jamMulai} - {jadwal.jamSelesai} WIB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0">
                  <Link
                    to={`/absensi?kelasId=${jadwal.kelasId}&mapel=${encodeURIComponent(jadwal.mapel)}`}
                  >
                    <Button size="sm" variant="primary" className="text-xs">
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Catat Absen
                    </Button>
                  </Link>
                  <Link to="/jurnal">
                    <Button size="sm" variant="outline" className="text-xs">
                      <BookOpen className="w-3.5 h-3.5 mr-1" /> Jurnal
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Kegiatan Ekstrakurikuler & Les Hari Ini */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-600" />
            Kegiatan & Les Hari Ini
          </h2>
          <Link
            to="/kegiatan"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
          >
            Buka Modul Kegiatan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Card className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Tidak ada agenda ekstrakurikuler / les hari ini
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola anggota lintas kelas, absensi kegiatan, dan jurnal les.
              </p>
            </div>
          </div>
          <Link to="/kegiatan">
            <Button size="sm" variant="outline">
              Kelola
            </Button>
          </Link>
        </Card>
      </div>

      {/* Status Cadangan Data */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Keamanan & Cadangan Data
        </h2>
        <Card
          className={`p-4 border transition-colors ${
            isBackupStale
              ? 'border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isBackupStale
                    ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isBackupStale ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isBackupStale ? 'Perlu Dicadangkan' : 'Data Aman & Tersimpan'}
                  </h4>
                  <Badge variant={isBackupStale ? 'warning' : 'success'}>
                    {lastBackup
                      ? `${daysSinceBackup} hari lalu`
                      : 'Belum pernah'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {isBackupStale
                    ? 'Aplikasi berjalan 100% di HP Anda. Cadangkan berkala ke file JSON agar data tidak hilang.'
                    : 'Seluruh data absensi, nilai, dan jurnal tersimpan aman di penyimpanan lokal HP Anda.'}
                </p>
              </div>
            </div>

            <Link to="/backup" className="w-full sm:w-auto">
              <Button size="sm" variant={isBackupStale ? 'primary' : 'outline'} className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                {isBackupStale ? 'Cadangkan Sekarang' : 'Kelola Cadangan'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
