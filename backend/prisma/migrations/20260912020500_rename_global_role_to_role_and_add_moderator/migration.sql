-- AlterEnum: Rename GlobalRole to Role and add MODERATOR
ALTER TYPE "GlobalRole" RENAME TO "Role";
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- AlterTable: Rename globalRole to role
ALTER TABLE "users" RENAME COLUMN "globalRole" TO "role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';

-- On production where only the owner account exists initially, grant ADMIN role
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "users") = 1 THEN
    UPDATE "users" SET "role" = 'ADMIN';
  END IF;
END $$;
