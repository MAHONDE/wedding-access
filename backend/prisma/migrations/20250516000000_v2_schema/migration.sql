-- Drop old tables
DROP TABLE IF EXISTS "Scan" CASCADE;
DROP TABLE IF EXISTS "PdfTemplate" CASCADE;
DROP TABLE IF EXISTS "Branding" CASCADE;
DROP TABLE IF EXISTS "Guest" CASCADE;
DROP TABLE IF EXISTS "Table" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Ceremony" CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS "ScanResult" CASCADE;
DROP TYPE IF EXISTS "InvitationStatus" CASCADE;
DROP TYPE IF EXISTS "TemplateType" CASCADE;
DROP TYPE IF EXISTS "EntryStatus" CASCADE;
DROP TYPE IF EXISTS "CeremonyType" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- New enums
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN_VIN_HONNEUR', 'AGENT_VIN_HONNEUR', 'AGENT_DINER');
CREATE TYPE "CeremonyType" AS ENUM ('VIN_HONNEUR', 'DINER');
CREATE TYPE "GuestType" AS ENUM ('INDIVIDUAL', 'COUPLE');
CREATE TYPE "EntryStatus" AS ENUM ('NOT_ARRIVED', 'ARRIVED');
CREATE TYPE "ScanResult" AS ENUM ('VALID', 'INVALID', 'ALREADY_USED', 'WRONG_CEREMONY');
CREATE TYPE "InvitationStatus" AS ENUM ('GENERATED', 'SENT_WHATSAPP', 'SENT_BLUETOOTH', 'NOT_SENT', 'OBSOLETE');
CREATE TYPE "TableShape" AS ENUM ('ROUND', 'RECTANGULAR', 'SQUARE');
CREATE TYPE "SeatingSourceType" AS ENUM ('MANUAL', 'GENERATED_FROM_PHOTO');

-- User
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "ceremonyScope" "CeremonyType",
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Ceremony
CREATE TABLE "Ceremony" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CeremonyType" NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ceremony_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ceremony_type_key" ON "Ceremony"("type");

-- AppBranding
CREATE TABLE "AppBranding" (
  "id" TEXT NOT NULL,
  "appName" TEXT NOT NULL DEFAULT 'Wedding Access',
  "monogramPath" TEXT,
  "primaryLogoPath" TEXT,
  "activeThemeMode" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppBranding_pkey" PRIMARY KEY ("id")
);

-- Table
CREATE TABLE "Table" (
  "id" TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "numberOfChairs" INTEGER NOT NULL DEFAULT 10,
  "positionX" DOUBLE PRECISION,
  "positionY" DOUBLE PRECISION,
  "shape" "TableShape" NOT NULL DEFAULT 'ROUND',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- Guest
CREATE TABLE "Guest" (
  "id" TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "type" "GuestType" NOT NULL DEFAULT 'INDIVIDUAL',
  "primaryName" TEXT NOT NULL,
  "companionName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "numberOfSeats" INTEGER NOT NULL DEFAULT 1,
  "tableId" TEXT,
  "entryStatus" "EntryStatus" NOT NULL DEFAULT 'NOT_ARRIVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- QRCode
CREATE TABLE "QRCode" (
  "id" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "qrImagePath" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QRCode_token_key" ON "QRCode"("token");

-- Template
CREATE TABLE "Template" (
  "id" TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "qrZoneConfig" JSONB,
  "placeholders" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- Invitation
CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "qrCodeId" TEXT NOT NULL,
  "templateId" TEXT,
  "pdfPath" TEXT,
  "fileName" TEXT,
  "status" "InvitationStatus" NOT NULL DEFAULT 'NOT_SENT',
  "isObsolete" BOOLEAN NOT NULL DEFAULT false,
  "regeneratedFromInvitationId" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- SeatingPlan
CREATE TABLE "SeatingPlan" (
  "id" TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "planData" JSONB NOT NULL DEFAULT '{}',
  "sourceType" "SeatingSourceType" NOT NULL DEFAULT 'MANUAL',
  "sourcePhotoPath" TEXT,
  "pdfPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeatingPlan_pkey" PRIMARY KEY ("id")
);

-- RoomPhoto
CREATE TABLE "RoomPhoto" (
  "id" TEXT NOT NULL,
  "seatingPlanId" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomPhoto_pkey" PRIMARY KEY ("id")
);

-- ScanLog
CREATE TABLE "ScanLog" (
  "id" TEXT NOT NULL,
  "guestId" TEXT,
  "ceremonyId" TEXT,
  "qrToken" TEXT NOT NULL,
  "scannedByUserId" TEXT NOT NULL,
  "result" "ScanResult" NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceInfo" TEXT,
  CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Table" ADD CONSTRAINT "Table_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Template" ADD CONSTRAINT "Template_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeatingPlan" ADD CONSTRAINT "SeatingPlan_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomPhoto" ADD CONSTRAINT "RoomPhoto_seatingPlanId_fkey" FOREIGN KEY ("seatingPlanId") REFERENCES "SeatingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_scannedByUserId_fkey" FOREIGN KEY ("scannedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
