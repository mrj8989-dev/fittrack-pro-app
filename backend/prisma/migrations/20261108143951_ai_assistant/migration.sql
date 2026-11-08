-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "userId" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "detail" TEXT NOT NULL DEFAULT 'brief',
    "goal" TEXT,
    "limitations" TEXT,
    "shareTraining" BOOLEAN NOT NULL DEFAULT true,
    "shareSessions" BOOLEAN NOT NULL DEFAULT true,
    "shareRevisions" BOOLEAN NOT NULL DEFAULT true,
    "shareNutrition" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" INTEGER,
    "apiKeyEncrypted" TEXT,
    "apiKeyLast4" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "AiMessage_userId_createdAt_idx" ON "AiMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
