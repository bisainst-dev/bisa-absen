import type { JadwalData } from '../../features/jadwal/jadwalSchema';
import type { CatatanData } from '../../features/catatan/catatanSchema';

export interface MissedReminder {
  id: string;
  tipe: 'jadwal' | 'catatan';
  judul: string;
  waktuSeharusnya: string;
  keterangan: string;
}

export interface IReminderService {
  requestPermission(): Promise<NotificationPermission>;
  sendNotification(title: string, body: string): boolean;
  speakTTS(message: string, namaPanggilan?: string): void;
  playChime(): void;
  getMissedReminders(
    jadwalHariIni: JadwalData[],
    catatanList: CatatanData[],
    kelasMap: Map<string, string>
  ): MissedReminder[];
}

/**
 * Cek apakah waktu saat ini berada dalam rentang jam senyap (misal 21:00 - 06:00)
 */
export function isQuietHours(mulaiStr: string, selesaiStr: string, now = new Date()): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [mH, mM] = mulaiStr.split(':').map(Number);
  const [sH, sM] = selesaiStr.split(':').map(Number);

  const startMin = mH * 60 + mM;
  const endMin = sH * 60 + sM;

  if (startMin > endMin) {
    // Melewati tengah malam (contoh 21:00 s.d. 06:00)
    return currentMinutes >= startMin || currentMinutes < endMin;
  } else {
    return currentMinutes >= startMin && currentMinutes < endMin;
  }
}

/**
 * Sintesis nada chime lembut menggunakan Web Audio API tanpa perlu unduh berkas eksternal
 */
export function playWebAudioChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Nada E5 -> G#5 -> B5 arpeggio ceria
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(830.61, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch (err) {
    console.warn('AudioContext not allowed or not supported:', err);
  }
}

class LocalReminderService implements IReminderService {
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return await Notification.requestPermission();
  }

  sendNotification(title: string, body: string): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        });
        return true;
      } catch (e) {
        console.warn('Gagal memicu notification:', e);
      }
    }
    return false;
  }

  speakTTS(message: string, namaPanggilan?: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel(); // batalkan suara yang sedang berjalan

    const prefix = namaPanggilan ? `Halo ${namaPanggilan}, ` : 'Halo, ';
    const utterance = new SpeechSynthesisUtterance(`${prefix}${message}`);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    window.speechSynthesis.speak(utterance);
  }

  playChime() {
    playWebAudioChime();
  }

  /**
   * Cek pengingat yang terlewat saat aplikasi baru dibuka kembali hari ini
   */
  getMissedReminders(
    jadwalHariIni: JadwalData[],
    catatanList: CatatanData[],
    kelasMap: Map<string, string>
  ): MissedReminder[] {
    const missed: MissedReminder[] = [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Cek jadwal mengajar yang jam mulainya sudah lewat hari ini
    for (const j of jadwalHariIni) {
      const [jam, mnt] = j.jamMulai.split(':').map(Number);
      const jadwalMinutes = jam * 60 + mnt;

      // Jika jam mulai sudah lewat lebih dari menit sebelum pengingat tapi belum selesai hari
      if (currentMinutes > jadwalMinutes) {
        missed.push({
          id: `missed_jadwal_${j.id}`,
          tipe: 'jadwal',
          judul: `Jadwal Mengajar ${j.mapel}`,
          waktuSeharusnya: `${j.jamMulai} WIB`,
          keterangan: `Kelas ${kelasMap.get(j.kelasId) || '-'} (${j.jamMulai} - ${j.jamSelesai})`,
        });
      }
    }

    // 2. Cek catatan pengingat yang waktunya sudah lewat dan belum selesai
    const todayDateStr = now.toISOString().split('T')[0];
    for (const c of catatanList) {
      if (!c.selesai && c.waktu) {
        const cDate = new Date(c.waktu);
        if (cDate.getTime() < now.getTime() && c.waktu.startsWith(todayDateStr)) {
          missed.push({
            id: `missed_catatan_${c.id}`,
            tipe: 'catatan',
            judul: c.judul,
            waktuSeharusnya: c.waktu.replace('T', ' '),
            keterangan: c.teks || 'Catatan agenda guru belum diselesaikan',
          });
        }
      }
    }

    return missed;
  }
}

export const reminderService = new LocalReminderService();
