import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @typedef {Object} FakeHostCompany
 * @property {string} companyName - The name of the host company
 * @property {string} phoneNumber - The phone number of the host company
 * @property {string} url - The URL of the host company's website
 * @property {string} assignedSuite - The assigned suite number for the host company
 */

/**
 * @typedef {Object} FakeHostInput
 * @property {string} email - The email address of the host user
 * @property {string} firstName - The first name of the host user
 * @property {string} lastName - The last name of the host user
 * @property {FakeHostCompany} company - The company information for the host
 */

/**
 * @typedef {Object} FakeHostResult
 * @property {any} fakeHostUser - The created or updated user object
 * @property {any} fakeHostCompany - The created or updated host company object
 */

/**
 * Creates or updates a fake host user and their associated company.
 *
 * @param {FakeHostInput} fakeHost - The input data for the fake host
 * @returns {Promise<FakeHostResult>} A promise that resolves to an object containing the created or updated user and host company
 * @throws {Error} Will throw an error if the host admin is not connected or if there's an ID mismatch
 */
async function createOrUpdateFakeHost(fakeHost) {
  return await prisma.$transaction(async (prisma) => {
    // 1. Create or update the user
    const userResult = await prisma.user.upsert({
      where: { email: fakeHost.email.toLowerCase() },
      update: {
        email: fakeHost.email.toLowerCase(),
        firstName: fakeHost.firstName,
        lastName: fakeHost.lastName,
        companyName: fakeHost.company.companyName,
        phoneNumber: fakeHost.company.phoneNumber,
        role: 'HOST_ADMIN',
        primaryContact: true,
      },
      create: {
        email: fakeHost.email.toLowerCase(),
        firstName: fakeHost.firstName,
        lastName: fakeHost.lastName,
        companyName: fakeHost.company.companyName,
        phoneNumber: fakeHost.company.phoneNumber,
        role: 'HOST_ADMIN',
        primaryContact: true,
      },
    });

    // 2. Connect the user to the host (or create a new host)
    const hostResult = await prisma.host.upsert({
      where: { companyName: fakeHost.company.companyName },
      update: {},
      create: {
        suiteSchedule: [],
        companyName: fakeHost.company.companyName,
        phoneNumber: fakeHost.company.phoneNumber,
        url: fakeHost.company.url,
        assignedSuite: fakeHost.company.assignedSuite,
        admin: {
          connect: { id: userResult.id },
        },
        pocEmail: userResult.email.toLowerCase(),
        pocFirstName: userResult.firstName,
        pocLastName: userResult.lastName,
        pocPhoneNumber: userResult.phoneNumber,
      },
    });

    // 3. Ensure the host admin is connected
    await prisma.host.update({
      where: { id: hostResult.id },
      data: {
        admin: {
          connect: { id: userResult.id },
        },
        users: {
          connect: { id: userResult.id },
        },
      },
    });

    // 4. Verify that the host admin is correctly connected
    const updatedHost = await prisma.host.findUnique({
      where: { id: hostResult.id },
      include: { admin: true },
    });

    if (!updatedHost || updatedHost.admin.id !== userResult.id) {
      throw new Error('Host admin not connected or ID mismatch');
    }

    return {
      fakeHostUser: userResult,
      fakeHostCompany: updatedHost,
    };
  });
}

async function main() {
  /**@type { FakeHostInput[]} */
  const fakeHosts = [
    {
      email: 'aaron+host@clearlyinnovative.com',
      firstName: 'Aaron',
      lastName: 'Host',
      company: {
        companyName: 'Clearly Innovative - Aaron Host',
        phoneNumber: '2025551212',
        url: 'https://clearlyinnovative-aaron.com',
        assignedSuite: '100',
      },
    },
    {
      email: 'nuno+host@clearlyinnovative.com',
      firstName: 'Nuno',
      lastName: 'Host',
      company: {
        companyName: 'Clearly Innovative - Nuno Host',
        phoneNumber: '2025551212',
        url: 'https://clearlyinnovative-nuno.com',
        assignedSuite: '100',
      },
    },
    {
      email: 'denise+host@clearlyinnovative.com',
      firstName: 'Denise',
      lastName: 'Host',
      company: {
        companyName: 'Clearly Innovative - Denise Host',
        phoneNumber: '2025551212',
        url: 'https://clearlyinnovative-denise.com',
        assignedSuite: '200',
      },
    },
    {
      email: 'jgoepel+host@futurefeed.co',
      firstName: 'jgoepel',
      lastName: 'Host',
      company: {
        companyName: 'jgoepel Host',
        phoneNumber: '2025551212',
        url: 'https://jgoepel.com',
        assignedSuite: '200',
      },
    },
    {
      email: 'mberman+host@futurefeed.co',
      firstName: 'mberman',
      lastName: 'Host',
      company: {
        companyName: 'mberman Host',
        phoneNumber: '2025551212',
        url: 'https://mberman.com',
        assignedSuite: '200',
      },
    },
  ];

  const adminUsers = [
    {
      email: 'aaron@clearlyinnovative.com',
      firstName: 'Aaron',
      lastName: 'Saunders',
      companyName: 'Clearly Innovative',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'mberman_admin@forummakers.com',
      firstName: 'Mark',
      lastName: 'Berman',
      companyName: 'Future Feed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'jgoepel_admin@forummakers.com',
      firstName: 'Jim',
      lastName: 'Goepel',
      companyName: 'Future Feed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'jmorin_admin@forummakers.com',
      firstName: 'Jessica',
      lastName: 'Morin',
      companyName: 'Forum Makers',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'denise@clearlyinnovative.com',
      firstName: 'Denise',
      lastName: 'Saunders',
      companyName: 'Clearly Innovative',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'nuno@clearlyinnovative.com',
      firstName: 'Nuno',
      lastName: 'Costa',
      companyName: 'Clearly Innovative',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'dimitris@futurefeed.co',
      firstName: 'Dimitris',
      lastName: 'Admin',
      companyName: 'Futurefeed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'vassilis@futurefeed.co',
      firstName: 'Vassilis',
      lastName: 'Admin',
      companyName: 'Futurefeed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'rthompson@futurefeed.co',
      firstName: 'Rthompson',
      lastName: 'Admin',
      companyName: 'Futurefeed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'tberman@futurefeed.co',
      firstName: 'Tberman',
      lastName: 'Admin',
      companyName: 'Futurefeed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'tmaccabee@futurefeed.co',
      firstName: 'Tmaccabee',
      lastName: 'Admin',
      companyName: 'Futurefeed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
    {
      email: 'rcornelsen@helmpoint.com',
      firstName: 'Rhonda',
      lastName: 'Cornelsen Admin',
      companyName: 'Futurefeed',
      phoneNumber: '2025551212',
      role: 'ADMIN',
      primaryContact: true,
    },
  ];
  console.log('### Seeding admin users...');
  for (const userData of adminUsers) {
    const adminUser = await prisma.user.upsert({
      where: { email: userData.email.toLowerCase() },
      update: {},
      create: userData,
    });

    console.log('Admin user created or already exists:', adminUser?.email);
  }


  // ========================================================================================
  // Skip seeding fake hosts in non-development environments
  // This is to prevent accidentally creating fake data in production
  // ========================================================================================
  // if (process.env.NODE_ENV !== 'development') {
  //   console.log('Skipping fake host seeding in non-development environment');
  //   return;
  // }

  console.log('### Seeding fake host(s)...');
  for (const fakeHost of fakeHosts) {
    const { fakeHostUser, fakeHostCompany } = await createOrUpdateFakeHost(fakeHost);

    console.log('Fake host user:', fakeHostUser.email);
    console.log('Fake host company:', fakeHostCompany.companyName);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
