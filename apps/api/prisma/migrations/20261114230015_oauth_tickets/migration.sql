-- CreateTable
CREATE TABLE "OAuthTicket" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthTicket_tokenHash_key" ON "OAuthTicket"("tokenHash");

-- AddForeignKey
ALTER TABLE "OAuthTicket" ADD CONSTRAINT "OAuthTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
