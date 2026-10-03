-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('BOOLEAN', 'NUMBER', 'RATING', 'SINGLE_SELECT', 'MULTIPLE_SELECT', 'TEXT');

-- CreateEnum
CREATE TYPE "GoalOperator" AS ENUM ('>=', '<=', '=');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('daily', 'weekly');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "groupId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "MetricType" NOT NULL,
    "unit" TEXT,
    "ratingMin" DOUBLE PRECISION,
    "ratingMax" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_options" (
    "id" UUID NOT NULL,
    "metricId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_records" (
    "id" UUID NOT NULL,
    "metricId" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "metricId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "targetValue" JSONB NOT NULL,
    "operator" "GoalOperator" NOT NULL,
    "period" "GoalPeriod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "groups_accountId_name_key" ON "groups"("accountId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_accountId_name_key" ON "metrics"("accountId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "metric_options_metricId_label_key" ON "metric_options"("metricId", "label");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_options" ADD CONSTRAINT "metric_options_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_records" ADD CONSTRAINT "metric_records_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
