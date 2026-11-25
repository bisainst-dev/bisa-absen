export type RecordKind =
  | 'profil'
  | 'siswa'
  | 'kelas'
  | 'jadwal'
  | 'absensi'
  | 'jurnal'
  | 'nilai'
  | 'kegiatan'
  | 'anggotaKegiatan'
  | 'jurnalKegiatan'
  | 'catatan'
  | 'pengaturan';

export interface GenericRecord<T = Record<string, unknown>> {
  id: string; // uuid v4
  kind: RecordKind | string;
  data: T;
  updatedAt: number;
  deleted: 0 | 1;
  dirty: 0 | 1;
}
