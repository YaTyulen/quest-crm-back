-- CreateTable
CREATE TABLE "BusinessRoleOnUser" (
    "userId" INTEGER NOT NULL,
    "businessRole" "BusinessRole" NOT NULL,

    CONSTRAINT "BusinessRoleOnUser_pkey" PRIMARY KEY ("userId","businessRole")
);

-- AddForeignKey
ALTER TABLE "BusinessRoleOnUser" ADD CONSTRAINT "BusinessRoleOnUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
