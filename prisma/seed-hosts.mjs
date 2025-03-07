// @ts-check
import { PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { readFile } from 'fs/promises';

const prisma = new PrismaClient();

/** @typedef {{ Host: string; Contact: string; Email: string, Suite:string, URL:string, Phone:string, Logo:string }} CsvRow */

async function main() {
  /** @type {CsvRow[]} */
  const results = [];

  // Wrap the CSV reading logic in a promise
  await new Promise((resolve, reject) => {
    fs.createReadStream('prisma/seed-data/hosts.csv')
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(), // Trim the headers
        })
      )
      .on('data', /** @param {CsvRow} data */ (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  for (const record of results) {
    const [firstName, lastName] = record.Contact.split(' ');
    const role = 'HOST_ADMIN'; // Assuming a role field

    try {
      // Convert logo file to base64
      let logoBase64 = '';
      if (record.Logo) {
        try {
          const logoPath = path.join('prisma/seed-data/logos', record.Logo);
          const logoBuffer = await readFile(logoPath);
          logoBase64 = logoBuffer.toString('base64');
        } catch (logoError) {
          console.warn(`Failed to read logo for ${record.Host}:`, logoError);
        }
      }

      // Create or connect the Host Admin
      const hostAdmin = await prisma.user.upsert({
        where: { email: record.Email.toLowerCase() },
        update: {
          firstName,
          lastName,
          email: record.Email.toLowerCase(),
          role,
          companyName: record.Host,
          primaryContact: true,
          phoneNumber: record.Phone,
        },
        create: {
          firstName,
          lastName,
          email: record.Email.toLowerCase(),
          role,
          companyName: record.Host,
          primaryContact: true,
          phoneNumber: record.Phone,
        },
      });

      // Create or connect the Host with the Admin
      const host = await prisma.host.upsert({
        where: { companyName: record.Host },
        update: {
          assignedSuite: 'To Be Determined',
          url: record.URL,
          phoneNumber: record.Phone,
          adminId: hostAdmin.id, // Assuming `adminId` is the foreign key in the `Host` model
          users: {
            connect: { id: hostAdmin.id },
          },
          logo: logoBase64, // Add the logo field
          serviceDescription: '',
          serviceOfferings: '',
        },
        create: {
          companyName: record.Host,
          assignedSuite: 'To Be Determined',
          url: record.URL,
          phoneNumber: record.Phone,
          admin: {
            connect: { id: hostAdmin.id },
          },
          users: {
            connect: { id: hostAdmin.id },
          },
          logo: logoBase64, // Add the logo field
          pocEmail: hostAdmin.email.toLowerCase(),
          pocFirstName: hostAdmin.firstName,
          pocLastName: hostAdmin.lastName,
          pocPhoneNumber: hostAdmin.phoneNumber,
        },
      });

      console.log(
        `Created or updated Host: ${host.companyName} with Admin: ${hostAdmin.firstName} ${hostAdmin.lastName}`
      );
    } catch (e) {
      console.error(`Error processing record for ${record.Host}:`, e);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
