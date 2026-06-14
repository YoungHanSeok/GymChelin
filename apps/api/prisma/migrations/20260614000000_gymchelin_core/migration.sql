-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('LOCAL', 'KAKAO', 'NAVER', 'GOOGLE');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('ACTIVE', 'BLINDED', 'DELETED');

-- CreateEnum
CREATE TYPE "post_category" AS ENUM ('FREE', 'WORKOUT_LOG');

-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('POST', 'COMMENT', 'ROUTINE', 'GYM_REVIEW');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ad_slot" AS ENUM ('MAIN_TOP', 'MAIN_LEFT', 'MAIN_RIGHT', 'POST_LIST_INLINE', 'GYM_DETAIL_SIDE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "password" TEXT,
    "nickname" VARCHAR(30) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "password_reset" CHAR(1) NOT NULL DEFAULT 'N',
    "delete_yn" CHAR(1) NOT NULL DEFAULT 'N',
    "change_pw_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" SERIAL NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "category" "post_category" NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'ACTIVE',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'ACTIVE',
    "post_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "summary" VARCHAR(240) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'ACTIVE',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_likes" (
    "id" SERIAL NOT NULL,
    "routine_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_wikis" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "target_muscles" TEXT[],
    "equipment" TEXT,
    "difficulty" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "how_to" TEXT[],
    "effects" TEXT[],
    "cautions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_wikis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_places" (
    "id" SERIAL NOT NULL,
    "provider" "auth_provider" NOT NULL DEFAULT 'KAKAO',
    "provider_place_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category_name" TEXT,
    "address_name" TEXT,
    "road_address_name" TEXT,
    "phone" TEXT,
    "place_url" TEXT,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "external_rating" DOUBLE PRECISION,
    "external_rating_source" TEXT,
    "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_reviews" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'ACTIVE',
    "gym_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "target_type" "report_target_type" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'PENDING',
    "reporter_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" SERIAL NOT NULL,
    "target_type" "report_target_type" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "reason" TEXT,
    "admin_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" SERIAL NOT NULL,
    "slot" "ad_slot" NOT NULL,
    "adsense_client" TEXT,
    "adsense_slot" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_banners" (
    "id" SERIAL NOT NULL,
    "slot" "ad_slot" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_user_id_key" ON "social_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "posts_category_status_created_at_idx" ON "posts"("category", "status", "created_at");

-- CreateIndex
CREATE INDEX "comments_post_id_status_created_at_idx" ON "comments"("post_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_post_id_user_id_key" ON "reactions"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "routines_status_like_count_created_at_idx" ON "routines"("status", "like_count", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "routine_likes_routine_id_user_id_key" ON "routine_likes"("routine_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_wikis_slug_key" ON "exercise_wikis"("slug");

-- CreateIndex
CREATE INDEX "exercise_wikis_name_idx" ON "exercise_wikis"("name");

-- CreateIndex
CREATE UNIQUE INDEX "gym_places_provider_place_id_key" ON "gym_places"("provider_place_id");

-- CreateIndex
CREATE INDEX "gym_reviews_gym_id_status_created_at_idx" ON "gym_reviews"("gym_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "gym_reviews_gym_id_user_id_key" ON "gym_reviews"("gym_id", "user_id");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_status_idx" ON "reports"("target_type", "target_id", "status");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_placements_slot_key" ON "ad_placements"("slot");

-- CreateIndex
CREATE INDEX "direct_banners_slot_is_active_starts_at_ends_at_priority_idx" ON "direct_banners"("slot", "is_active", "starts_at", "ends_at", "priority");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_likes" ADD CONSTRAINT "routine_likes_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_likes" ADD CONSTRAINT "routine_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
