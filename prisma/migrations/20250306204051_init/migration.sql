-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HOST_ADMIN', 'HOST_TEAM_MEMBER', 'ATTENDEE', 'ATTENDEE_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "jobTitle" TEXT,
    "primaryContact" BOOLEAN NOT NULL,
    "role" "UserRole" NOT NULL,
    "hostid" TEXT,
    "attendeeCompanyId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "passwordSet" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "assignedSuite" TEXT NOT NULL,
    "url" TEXT,
    "serviceOfferings" JSONB,
    "serviceDescription" TEXT,
    "specialOfferings" TEXT,
    "adminId" TEXT,
    "logo" TEXT,
    "pocFirstName" TEXT,
    "pocLastName" TEXT,
    "pocEmail" TEXT,
    "pocPhoneNumber" TEXT,
    "suiteSchedule" JSONB,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendeeCompany" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "url" TEXT,
    "logo" TEXT,
    "needsDescription" TEXT,
    "numberOfEmployees" INTEGER NOT NULL DEFAULT 1,
    "numberOfLocations" INTEGER NOT NULL DEFAULT 1,
    "readyForAssessment" INTEGER NOT NULL DEFAULT 5,
    "maxMatches" INTEGER NOT NULL DEFAULT 6,
    "schedulePrefs" JSONB,
    "selectedHosts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedHosts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adminId" TEXT NOT NULL,

    CONSTRAINT "AttendeeCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "code" TEXT,
    "assignedSuite" TEXT,
    "walkIn" BOOLEAN,
    "hostId" TEXT NOT NULL,
    "attendeeId" TEXT,
    "boothAssigned" TEXT[],
    "verified" BOOLEAN DEFAULT false,
    "userId" TEXT,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Host_companyName_key" ON "Host"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "Host_adminId_key" ON "Host"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendeeCompany_companyName_key" ON "AttendeeCompany"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "AttendeeCompany_adminId_key" ON "AttendeeCompany"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_hostId_date_time_key" ON "Meeting"("hostId", "date", "time");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_eventId_key" ON "schedules"("eventId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_attendeeCompanyId_fkey" FOREIGN KEY ("attendeeCompanyId") REFERENCES "AttendeeCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hostid_fkey" FOREIGN KEY ("hostid") REFERENCES "Host"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeCompany" ADD CONSTRAINT "AttendeeCompany_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "AttendeeCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
