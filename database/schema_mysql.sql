-- ==============================================================================
-- BISA ABSEN / ESDUTA GATE - DATABASE SCHEMA UNTUK AAPANEL (MYSQL / MARIADB)
-- Kompatibel dengan MySQL 5.7, MySQL 8.0, dan MariaDB 10.x pada aaPanel
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `bisa_absen` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bisa_absen`;

-- TABEL UTAMA: RECORDS (Menyimpan seluruh entri: jadwal, absensi, siswa, kelas, nilai, jurnal, catatan, profil)
CREATE TABLE IF NOT EXISTS `records` (
  `id` VARCHAR(255) NOT NULL,
  `tenant_id` VARCHAR(255) NULL DEFAULT 'tenant-demo-smpn2',
  `user_id` VARCHAR(255) NULL DEFAULT 'usr-guru-budi',
  `kind` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  `deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_records_kind_del` (`kind`, `deleted`),
  INDEX `idx_records_tenant` (`tenant_id`),
  INDEX `idx_records_user` (`user_id`),
  INDEX `idx_records_updated` (`updated_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABEL TENANTS (Sekolah / Lembaga)
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(255) NOT NULL,
  `nama_sekolah` VARCHAR(255) NOT NULL,
  `npsn` VARCHAR(50) NULL,
  `jenjang` VARCHAR(50) DEFAULT 'SMP',
  `alamat` TEXT NULL,
  `tier` VARCHAR(50) NOT NULL DEFAULT 'school_starter',
  `kuota_guru` INT NOT NULL DEFAULT 50,
  `kuota_siswa` INT NOT NULL DEFAULT 1000,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED DATA DEFAULT (Tenant Sekolah & Akun Guru)
INSERT INTO `tenants` (`id`, `nama_sekolah`, `npsn`, `jenjang`, `tier`, `kuota_guru`, `kuota_siswa`)
VALUES ('tenant-demo-smpn2', 'SMP Negeri 2 Tanjung', '20104050', 'SMP', 'school_starter', 50, 1000)
ON DUPLICATE KEY UPDATE `nama_sekolah` = VALUES(`nama_sekolah`);
