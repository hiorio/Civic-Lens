-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('NATIONAL_ASSEMBLY_API', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('BILL_REGISTERED', 'BILL_PRIMARY_SPONSORED', 'BILL_CO_SPONSORED', 'BILL_STATUS_CHANGED', 'BILL_REFERRED_TO_COMMITTEE', 'BILL_PASSED_PLENARY', 'BILL_DISCARDED_OR_WITHDRAWN', 'MEETING_REMARK_ADDED');

-- CreateEnum
CREATE TYPE "FollowTargetKind" AS ENUM ('MEMBER', 'BILL', 'DISTRICT', 'KEYWORD', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNKNOWN', 'RECEIVED', 'REFERRED_TO_COMMITTEE', 'UNDER_COMMITTEE_REVIEW', 'PASSED_COMMITTEE', 'PASSED_PLENARY', 'PROMULGATED', 'DISCARDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BillMemberRole" AS ENUM ('PRIMARY_SPONSOR', 'CO_SPONSOR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partyName" TEXT,
    "districtId" TEXT,
    "districtName" TEXT,
    "profileUrl" TEXT,
    "photoUrl" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UNKNOWN',
    "proposedAt" TIMESTAMP(3),
    "committeeName" TEXT,
    "detailUrl" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillMember" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "BillMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillStatusHistory" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "fromStatus" "BillStatus",
    "toStatus" "BillStatus" NOT NULL,
    "source" "ActivitySource" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "rawStatus" TEXT,
    "description" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "source" "ActivitySource" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT,
    "targetKind" "FollowTargetKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "rawData" JSONB,
    "billId" TEXT,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetKind" "FollowTargetKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "source" "ActivitySource" NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "storedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_externalId_key" ON "Member"("externalId");

-- CreateIndex
CREATE INDEX "Member_name_idx" ON "Member"("name");

-- CreateIndex
CREATE INDEX "Member_districtId_idx" ON "Member"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "District_externalId_key" ON "District"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_externalId_key" ON "Bill"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNo_key" ON "Bill"("billNo");

-- CreateIndex
CREATE INDEX "Bill_status_proposedAt_idx" ON "Bill"("status", "proposedAt");

-- CreateIndex
CREATE INDEX "BillMember_memberId_role_idx" ON "BillMember"("memberId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "BillMember_billId_memberId_role_key" ON "BillMember"("billId", "memberId", "role");

-- CreateIndex
CREATE INDEX "BillStatusHistory_billId_changedAt_idx" ON "BillStatusHistory"("billId", "changedAt");

-- CreateIndex
CREATE INDEX "BillStatusHistory_toStatus_changedAt_idx" ON "BillStatusHistory"("toStatus", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityEvent_dedupeKey_key" ON "ActivityEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "ActivityEvent_targetKind_targetId_occurredAt_idx" ON "ActivityEvent"("targetKind", "targetId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_source_type_occurredAt_idx" ON "ActivityEvent"("source", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_billId_occurredAt_idx" ON "ActivityEvent"("billId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_memberId_occurredAt_idx" ON "ActivityEvent"("memberId", "occurredAt");

-- CreateIndex
CREATE INDEX "Follow_targetKind_targetId_idx" ON "Follow"("targetKind", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_targetKind_targetId_key" ON "Follow"("userId", "targetKind", "targetId");

-- CreateIndex
CREATE INDEX "SyncLog_source_jobName_startedAt_idx" ON "SyncLog"("source", "jobName", "startedAt");

-- CreateIndex
CREATE INDEX "SyncLog_status_startedAt_idx" ON "SyncLog"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillMember" ADD CONSTRAINT "BillMember_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillMember" ADD CONSTRAINT "BillMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillStatusHistory" ADD CONSTRAINT "BillStatusHistory_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
