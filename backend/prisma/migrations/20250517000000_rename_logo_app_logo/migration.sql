-- Rename primaryLogoPath → appLogoPath and related fields
-- Drop old logoData/logoMime columns (they mapped to primaryLogo, not monogram)
ALTER TABLE "AppBranding" RENAME COLUMN "primaryLogoPath" TO "appLogoPath";
ALTER TABLE "AppBranding" RENAME COLUMN "logoData"        TO "appLogoData";
ALTER TABLE "AppBranding" RENAME COLUMN "logoMime"        TO "appLogoMime";
