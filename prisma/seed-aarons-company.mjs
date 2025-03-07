import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companyName = "Aaron's Company";
  const adminEmail = 'aaron+ac@clearlyinnovative.com';
  const attendeeEmail = 'aaron+actm@clearlyinnovative.com';

  // clean up any old data
  await prisma.attendeeCompany.deleteMany({
    where: { companyName: companyName },
  });

  await prisma.user.deleteMany({
    where: { email: { in: [adminEmail, attendeeEmail] } },
  });

  // Create the attendee company
  const attendeeCompany = await prisma.attendeeCompany.create({
    data: {
      companyName: companyName,
      phoneNumber: '123-456-7890',
      url: 'https://aaronscompany.com',
      logo: 'https://aaronscompany.com/logo.png',
      needsDescription: "Needs description for Aaron's Company",
      numberOfEmployees: 50,
      numberOfLocations: 5,
      readyForAssessment: 10,
      schedulePrefs: {},
      admin: {
        create: {
          firstName: 'Aaron',
          lastName: 'Admin',
          email: adminEmail,
          phoneNumber: '123-456-7890',
          jobTitle: 'CEO',
          primaryContact: true,
          role: 'ATTENDEE_ADMIN',
          companyName: companyName,
        },
      },
    },
  });

  // update the user with the company
  await prisma.user.update({
    where: { email: adminEmail },
    data: {
      attendeeCompanyId: attendeeCompany.id,
    },
  });

  // add an attendee user to the company

  await prisma.user.create({
    data: {
      firstName: 'Aaron',
      lastName: 'Attendee',
      email: attendeeEmail,
      phoneNumber: '123-456-7890',
      jobTitle: 'CTO',
      role: 'ATTENDEE',
      companyName: companyName,
      attendeeCompanyId: attendeeCompany.id,
      primaryContact: false,
    },
  });

  console.log(`Seeded ${companyName} with admin ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
