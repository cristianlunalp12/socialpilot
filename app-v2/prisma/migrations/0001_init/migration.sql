-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accessToken" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountMetric" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "followers" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "engagements" INTEGER NOT NULL,

    CONSTRAINT "AccountMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTarget" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "externalId" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "metricsAt" TIMESTAMP(3),

    CONSTRAINT "PostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_workspaceId_platform_externalId_key" ON "SocialAccount"("workspaceId", "platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMetric_accountId_date_key" ON "AccountMetric"("accountId", "date");

-- CreateIndex
CREATE INDEX "Post_status_scheduledAt_idx" ON "Post"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Post_workspaceId_scheduledAt_idx" ON "Post"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostTarget_postId_accountId_key" ON "PostTarget"("postId", "accountId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMetric" ADD CONSTRAINT "AccountMetric_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

