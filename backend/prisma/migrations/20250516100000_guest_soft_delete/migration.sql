-- AlterTable: add soft-delete column to Guest
ALTER TABLE "Guest" ADD COLUMN "deletedAt" TIMESTAMP(3);
