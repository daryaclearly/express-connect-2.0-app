// @ts-check
import { PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import fs from 'fs';

const prisma = new PrismaClient();

const DELETE_USERS_AND_COMPANIES = true;
const SEED_FILE = 'prisma/seed-data/attendees.csv';

/** @typedef {{ company: string; first: string; last:string;  email: string; jobTitle:string; isAdmin:string, phone:string }} CsvRow */

const processAttendeeAsAdmin = async (record) => {
  // Create or connect the Host Admin
  const attendeeAdmin = await prisma.user.upsert({
    where: { email: record.email?.toLowerCase() },
    update: {
      firstName: record.first,
      lastName: record.last,
      role: 'ATTENDEE', // Assuming there's a role field
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
      role: 'ATTENDEE', // Assuming there's a role field
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

const processAttendees = async () => {
  /**  @type {CsvRow[]} */

  if (!fs.existsSync(SEED_FILE)) {
    console.error(`${SEED_FILE} does not exist.`);
    process.exit(1);
  }
  const results = await readCsv(SEED_FILE);

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

    const adminRecord = attendees.find(record => record.isAdmin?.toLowerCase() === 'true') || attendees[0];

    if (!attendeeCompany) {
      // Create the company with the admin (either flagged or first user)
      const admin = await processAttendeeAsAdmin(adminRecord);
      attendeeCompany = await prisma.attendeeCompany.findUnique({
        where: { companyName: company },
      });
      console.log(`Created Attendee Company: ${company} with Admin: ${admin.firstName} ${admin.lastName}`);
    }

    // Process all attendees for this company
    await Promise.all(attendees.map(async (record) => {
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
          role: role,
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
          role: role,
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

      console.log(`Created or updated Attendee: ${attendee.firstName} ${attendee.lastName} (${role})`);
    }));
  }
};

const readCsv = async (filePath) => {
  /**  @type {CsvRow[]} */
  const results = [];

  // Wrap the CSV reading logic in a promise
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(), // Trim the headers
        })
      )
      .on('data', /** @param {CsvRow} data */ (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  return results;
};

const processAdmins = async () => {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`${SEED_FILE} does not exist.`);
    process.exit(1);
  }
  const results = await readCsv(SEED_FILE);

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

  if(DELETE_USERS_AND_COMPANIES) {

    // delete attendee companies
    await prisma.attendeeCompany.deleteMany();

    // delete users with attendee role ('ATTENDEE_ADMIN', 'ATTENDEE')
    await prisma.user.deleteMany({
      where: {
        role: {
          in: ['ATTENDEE_ADMIN', 'ATTENDEE'],
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
