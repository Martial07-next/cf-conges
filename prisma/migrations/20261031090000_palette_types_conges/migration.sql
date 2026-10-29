-- Palette harmonisée des types de congés (même bleu télétravail que
-- l'agenda de la Direction pour tout le monde). Les couleurs restent
-- modifiables ensuite dans Administration > Types de congés.
UPDATE "LeaveType" SET "couleur" = '#16A34A' WHERE "code" = 'CP';
UPDATE "LeaveType" SET "couleur" = '#0D9488' WHERE "code" = 'RH';
UPDATE "LeaveType" SET "couleur" = '#64748B' WHERE "code" = 'C';
UPDATE "LeaveType" SET "couleur" = '#2563EB' WHERE "code" = 'TT';
UPDATE "LeaveType" SET "couleur" = '#F59E0B' WHERE "code" = 'ARM';
UPDATE "LeaveType" SET "couleur" = '#EAB308' WHERE "code" = 'ASA';
UPDATE "LeaveType" SET "couleur" = '#DC2626' WHERE "code" = 'at';
UPDATE "LeaveType" SET "couleur" = '#9333EA' WHERE "code" = 'ext';
UPDATE "LeaveType" SET "couleur" = '#0891B2' WHERE "code" = 'ec';
UPDATE "LeaveType" SET "couleur" = '#BE123C' WHERE "code" = 'abs';
