ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

UPDATE "users"
SET "role" = 'SUPER_ADMIN'
WHERE "id" = 1
  AND "email" = 'sywsyw159@naver.com';
