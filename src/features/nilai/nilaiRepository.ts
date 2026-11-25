import { genericRepo } from '../../db/dexie';
import { NilaiSchema, type NilaiData, type EntriNilaiSiswa } from './nilaiSchema';
import { v4 as uuidv4 } from 'uuid';

export type CreateNilaiColumnInput = {
  id?: string;
  kelasId: string;
  mapel: string;
  semester: 'Ganjil' | 'Genap';
  tahunPelajaran: string;
  jenis: 'Tugas' | 'PH';
  kode: string;
  judul?: string;
  entri?: EntriNilaiSiswa[];
};

export const nilaiRepo = {
  async getAll(): Promise<NilaiData[]> {
    const records = await genericRepo.findByKind<NilaiData>('nilai', false);
    return records.map((r) => NilaiSchema.parse(r.data));
  },

  async getByFilter(
    kelasId: string,
    mapel: string,
    semester: 'Ganjil' | 'Genap',
    tahunPelajaran: string
  ): Promise<NilaiData[]> {
    const all = await this.getAll();
    return all.filter(
      (n) =>
        n.kelasId === kelasId &&
        n.mapel.toLowerCase() === mapel.toLowerCase() &&
        n.semester === semester &&
        n.tahunPelajaran === tahunPelajaran
    );
  },

  async getById(id: string): Promise<NilaiData | undefined> {
    const rec = await genericRepo.getById<NilaiData>(id);
    if (!rec || rec.deleted === 1) return undefined;
    return NilaiSchema.parse(rec.data);
  },

  async createColumn(data: CreateNilaiColumnInput): Promise<NilaiData> {
    const id = data.id || uuidv4();
    const validated = NilaiSchema.parse({
      ...data,
      id,
      judul: data.judul || '',
      entri: data.entri || [],
    });
    await genericRepo.upsert<NilaiData>('nilai', id, validated);
    return validated;
  },

  async updateColumn(id: string, data: Partial<CreateNilaiColumnInput>): Promise<NilaiData> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Kolom penilaian tidak ditemukan');
    const merged = {
      ...existing,
      ...data,
      entri: data.entri || existing.entri,
    };
    const validated = NilaiSchema.parse(merged);
    await genericRepo.upsert<NilaiData>('nilai', id, validated);
    return validated;
  },

  async saveBatchScore(
    columnId: string,
    newEntries: EntriNilaiSiswa[]
  ): Promise<NilaiData> {
    const existing = await this.getById(columnId);
    if (!existing) throw new Error('Kolom penilaian tidak ditemukan');

    const entryMap = new Map<string, number | null>();
    for (const e of existing.entri) entryMap.set(e.siswaId, e.nilai);
    for (const e of newEntries) entryMap.set(e.siswaId, e.nilai);

    const mergedEntries: EntriNilaiSiswa[] = [];
    for (const [siswaId, nilai] of entryMap.entries()) {
      mergedEntries.push({ siswaId, nilai });
    }

    return await this.updateColumn(columnId, { entri: mergedEntries });
  },

  async deleteColumn(id: string): Promise<void> {
    await genericRepo.softDelete(id);
  },
};
