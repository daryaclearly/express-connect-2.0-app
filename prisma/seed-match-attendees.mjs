// @ts-check
import { PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import fs from 'fs';

const prisma = new PrismaClient();

const DELETE_USERS_AND_COMPANIES = true;

/** @typedef {{ company: string; first: string; last:string;  email: string; jobTitle:string; isAdmin:string, phone:string }} CsvRow */

const processAttendeeAsAdmin = async (record) => {
  // Create or connect the Host Admin
  const attendeeAdmin = await prisma.user.upsert({
    where: { email: record.email?.toLowerCase() },
    update: {
      firstName: record.first,
      lastName: record.last,
      role: 'ATTENDEE_ADMIN', // Assuming there's a role field
      email: record.email.toLowerCase(),
      companyName: record.company,
      primaryContact: true,
      phoneNumber: record.phone,
      jobTitle: record.jobTitle,
    },
    create: {
      firstName: record.first,
      lastName: record.last,
      email: record.email.toLowerCase(),
      role: 'ATTENDEE_ADMIN', // Assuming there's a role field
      companyName: record.company,
      primaryContact: true,
      phoneNumber: record.phone,
      jobTitle: record.jobTitle,
    },
  });

  // Create or connect the AttendeeCompany with the Admin
  const attendeeCompany = await prisma.attendeeCompany.upsert({
    where: { companyName: record.company },
    update: {
      phoneNumber: record.phone,
      companyName: record.company,
      adminId: attendeeAdmin.id, // Assuming `adminId` is the foreign key in the `Host` model
      users: {
        connect: { id: attendeeAdmin.id },
      },
    },
    create: {
      companyName: record.company,
      phoneNumber: record.phone,
      admin: {
        connect: { id: attendeeAdmin.id },
      },
      users: {
        connect: { id: attendeeAdmin.id },
      },
    },
  });

  return attendeeAdmin;
};

const MOCK_ATTENDEES = [
  {
    company: 'Company A MT',
    first: 'John',
    last: 'Doe',
    email: 'aaron+jd@clearlyinnovative.com',
    jobTitle: 'Software Engineer',
    isAdmin: 'true',
    phone: '123-456-7890',
  },

  {
    company: 'Company B MT',
    first: 'Jane',
    last: 'Smith',
    email: 'aaron+js@clearlyinnovative.com',
    jobTitle: 'Product Manager',
    isAdmin: 'false',
    phone: '234-567-8901',
  },
  {
    company: 'Company C MT',
    first: 'Alice',
    last: 'Johnson',
    email: 'aaron+aj@clearlyinnovative.com',
    jobTitle: 'Designer',
    isAdmin: 'true',
    phone: '345-678-9012',
  },
  {
    company: 'Company D MT',
    first: 'Bob',
    last: 'Brown',
    email: 'aaron+bb@clearlyinnovative.com',
    jobTitle: 'Marketing Specialist',
    isAdmin: 'false',
    phone: '456-789-0123',
  },
  {
    company: 'Company E MT',
    first: 'Charlie',
    last: 'Davis',
    email: 'aaron+cd@clearlyinnovative.com',
    jobTitle: 'Sales Manager',
    isAdmin: 'true',
    phone: '567-890-1234',
  },
  {
    company: 'Company F MT',
    first: 'Eve',
    last: 'Wilson',
    email: 'aaron+ew@clearlyinnovative.com',
    jobTitle: 'HR Specialist',
    isAdmin: 'false',
    phone: '678-901-2345',
  },
];

const MOCK_SCHEDULE_PREFS = [
  {
    day: 'Thursday 11/21',
    sessions: [
      { time: '8:00 am', title: 'Breakfast and Registration' },
      {
        time: '9:00 am',
        title: 'General Session:\nMatt Travis - Annual Report on the CMMC Ecosystem',
      },
      { time: '9:50 am', title: 'General Session: MEP Session' },
      { time: '10:25 am', title: 'General Session: Securing OUR Supply Chain' },
      { time: '11:10 am', title: 'General Session: Securing YOUR Supply Chain' },
      {
        time: '11:45 am',
        title: 'General Session:\nRobert Metzger - "The NOW and the FUTURE of CMMC"',
      },
      { time: '12:30 pm', title: "General Session: Patriot's Lunch" },
      { time: '2:00 pm', title: 'Track Breakout Session #1' },
      { time: '3:30 pm', title: 'Track Breakout Session #2' },
    ],
    timeSlots: [
      { time: '8:00 - 8:30 am', isBlocked: true, preference: 3 },
      { time: '8:30 - 9:00 am', isBlocked: true, preference: 3 },
      { time: '9:00 - 9:30 am', isBlocked: false, preference: 5 },
      { time: '9:30 - 10:00 am', isBlocked: false, preference: 3 },
      { time: '10:00 - 10:30 am', isBlocked: false, preference: 3 },
      { time: '10:30 - 11:00 am', isBlocked: false, preference: 3 },
      { time: '11:00 - 11:30 am', isBlocked: false, preference: 3 },
      { time: '11:30 - 12:00 pm', isBlocked: false, preference: 3 },
      { time: '12:00 - 12:30 pm', isBlocked: false, preference: 5 },
      { time: '12:30 - 1:00 pm', isBlocked: false, preference: 3 },
      { time: '1:00 - 1:30 pm', isBlocked: false, preference: 3 },
      { time: '1:30 - 2:00 pm', isBlocked: false, preference: 3 },
      { time: '2:00 - 3:30 pm', isBlocked: false, preference: 3 },
      { time: '2:30 - 3:00 pm', isBlocked: false, preference: 3 },
      { time: '3:00 - 3:30 pm', isBlocked: false, preference: 5 },
      { time: '3:30 - 4:00 pm', isBlocked: true, preference: 3 },
      { time: '4:00 - 4:30 pm', isBlocked: true, preference: 3 },
    ],
  },
  {
    day: 'Friday 11/22',
    sessions: [
      { time: '8:00 am', title: 'Breakfast and Registration' },
      { time: '9:00 am', title: 'Track Breakout Session #1' },
      { time: '10:45 am', title: 'Track Breakout Session #2' },
      { time: '12:30 pm', title: "General Session:\nDefender's Lunch" },
    ],
    timeSlots: [
      { time: '8:00 - 8:30 am', isBlocked: true, preference: 3 },
      { time: '8:30 - 9:00 am', isBlocked: true, preference: 3 },
      { time: '9:00 - 9:30 am', isBlocked: false, preference: 5 },
      { time: '9:30 - 10:00 am', isBlocked: false, preference: 4 },
      { time: '10:00 - 10:30 am', isBlocked: false, preference: 3 },
      { time: '10:30 - 11:00 am', isBlocked: false, preference: 3 },
      { time: '11:00 - 11:30 am', isBlocked: true, preference: 3 },
      { time: '11:30 - 12:00 pm', isBlocked: true, preference: 3 },
    ],
  },
];

const processAttendees = async () => {
  /**  @type {CsvRow[]} */

  const results = MOCK_ATTENDEES;

  // Group attendees by company
  const attendeesByCompany = results.reduce((acc, record) => {
    if (!acc[record.company]) {
      acc[record.company] = [];
    }
    acc[record.company].push(record);
    return acc;
  }, {});

  for (const [company, attendees] of Object.entries(attendeesByCompany)) {
    let attendeeCompany = await prisma.attendeeCompany.findUnique({
      where: { companyName: company },
    });

    const adminRecord =
      attendees.find((record) => record.isAdmin?.toLowerCase() === 'true') || attendees[0];

    if (!attendeeCompany) {
      // Create the company with the admin (either flagged or first user)
      const admin = await processAttendeeAsAdmin(adminRecord);
      attendeeCompany = await prisma.attendeeCompany.findUnique({
        where: { companyName: company },
      });
      console.log(
        `Created Attendee Company: ${company} with Admin: ${admin.firstName} ${admin.lastName}`
      );
    }

    // Process all attendees for this company
    await Promise.all(
      attendees.map(async (record) => {
        const isAdmin = record === adminRecord;
        const role = isAdmin ? 'ATTENDEE_ADMIN' : 'ATTENDEE';

        if (!attendeeCompany) {
          throw new Error(`AttendeeCompany not found for company: ${company}`);
        }

        const attendee = await prisma.user.upsert({
          where: { email: record.email?.toLowerCase() },
          update: {
            firstName: record.first,
            lastName: record.last,
            role: 'ATTENDEE_ADMIN',
            email: record.email?.toLowerCase(),
            companyName: record.company,
            primaryContact: isAdmin,
            phoneNumber: record.phone,
            jobTitle: record.jobTitle,
            attendeeCompanyId: attendeeCompany.id,
          },
          create: {
            firstName: record.first,
            lastName: record.last,
            email: record.email?.toLowerCase(),
            role: 'ATTENDEE_ADMIN',
            companyName: record.company,
            primaryContact: isAdmin,
            phoneNumber: record.phone,
            jobTitle: record.jobTitle,
            attendeeCompanyId: attendeeCompany.id,
          },
        });

        if (isAdmin) {
          await prisma.attendeeCompany.update({
            where: { id: attendeeCompany.id },
            data: { adminId: attendee.id },
          });
        }

        console.log(
          `Created or updated Attendee: ${attendee.firstName} ${attendee.lastName} (${role})`
        );
      })
    );
  }
};

const processAdmins = async () => {
  const results = MOCK_ATTENDEES;
  // filter the results by isAdmin, if there is a value, it will be processed
  const admins = results.filter((record) => record?.isAdmin?.toLowerCase().length !== 0);

  await Promise.all(
    admins.map(async (record) => {
      // Create or connect the Host Admin
      const attendeeAdmin = await processAttendeeAsAdmin(record);

      console.log(
        `Created or updated Attendee: ${attendeeAdmin.companyName} with Admin: ${attendeeAdmin.firstName} ${attendeeAdmin.lastName}`
      );
    })
  );
};

async function main() {
  if (DELETE_USERS_AND_COMPANIES) {
    // delete attendee companies
    await prisma.attendeeCompany.deleteMany({
      where: {
        companyName: {
          in: MOCK_ATTENDEES.map((attendee) => attendee.company),
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: MOCK_ATTENDEES.map((attendee) => attendee.email.toLowerCase()),
        },
      },
    });
  }

  await processAdmins();

  await processAttendees();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
