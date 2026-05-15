-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN_VIN_HONNEUR', 'AGENT_VIN_HONNEUR', 'AGENT_DINER');

-- CreateEnum
CREATE TYPE "CeremonyType" AS ENUM ('VIN_HONNEUR', 'DINER');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'INVITED', 'CONFIRMED', 'ARRIVED', 'ABSENT');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('OK', 'ALREADY_SCANNED', 'INVALID_TOKEN', 'WRONG_CEREMONY', 'NOT_CONFIRMED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'GENERATED', 'SENT');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('PDF', 'IMAGE');

-- CreateTable
CREATE TABLE "Ceremony" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CeremonyType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ceremony_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ceremonyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "tableId" TEXT,
    "tableNumber" TEXT,
    "entryStatus" "EntryStatus" NOT NULL DEFAULT 'INVITED',
    "qrToken" TEXT,
    "qrCodePath" TEXT,
    "invitationPath" TEXT,
    "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "guestId" TEXT,
    "scannedById" TEXT,
    "token" TEXT NOT NULL,
    "result" "ScanResult" NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "coupleName" TEXT NOT NULL DEFAULT 'M & J',
    "eventDate" TIMESTAMP(3),
    "primaryColor" TEXT NOT NULL DEFAULT '#C9A84C',
    "accentColor" TEXT NOT NULL DEFAULT '#E8D5A0',
    "fontFamily" TEXT NOT NULL DEFAULT 'Cormorant Garamond',
    "monogramPath" TEXT,
    "logoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfTemplate" (
    "id" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL DEFAULT 'PDF',
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "qrX" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "qrY" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "qrSize" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_qrToken_key" ON "Guest"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Branding_ceremonyId_key" ON "Branding"("ceremonyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfTemplate" ADD CONSTRAINT "PdfTemplate_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
