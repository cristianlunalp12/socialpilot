-- CreateTable
CREATE TABLE "FeatureInterest" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 1,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureInterest_feature_idx" ON "FeatureInterest"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureInterest_userId_feature_key" ON "FeatureInterest"("userId", "feature");

-- AddForeignKey
ALTER TABLE "FeatureInterest" ADD CONSTRAINT "FeatureInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureInterest" ADD CONSTRAINT "FeatureInterest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
