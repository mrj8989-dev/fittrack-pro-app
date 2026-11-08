-- CreateTable
CREATE TABLE "ModuleSetting" (
    "module" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleSetting_pkey" PRIMARY KEY ("module")
);

-- CreateTable
CREATE TABLE "UserModuleOverride" (
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,

    CONSTRAINT "UserModuleOverride_pkey" PRIMARY KEY ("userId","module")
);

-- AddForeignKey
ALTER TABLE "UserModuleOverride" ADD CONSTRAINT "UserModuleOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
