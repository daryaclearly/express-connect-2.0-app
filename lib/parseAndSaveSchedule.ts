// utils/parseAndSaveSchedule.js

import { PrismaClient } from '@prisma/client';
import { Schedule } from '@prisma/client';
const prisma = new PrismaClient();

export interface CSVData {
  schedDate: string;
  time: string;
  session: string;
  [key: string]: string; // For any additional fields
}

export async function parseAndSaveSchedule(events: CSVData[]) {
  console.log('parseAndSaveSchedule', events.length);
  const results: any[] = [];

  events.forEach((data, index) => {
    const { schedDate, time, session } = data;
    if (schedDate && time && session) {
      const eventId = (schedDate.toLowerCase().trim() + time.toLocaleLowerCase().trim()).replace(
        /[\/\s]/g,
        '_'
      );
      results.push({
        eventId,
        date: schedDate,
        time,
        session,
        sortIndex: index, // Add the sort index here
      });
    } else {
      console.log('Missing data:', { schedDate, time, session });
    }
  });

  // Remove duplicates
  const uniqueResults = results.filter(
    (v, i, a) => a.findIndex((t) => t.eventId === v.eventId) === i
  );

  // delete all schedules
  await prisma.schedule.deleteMany();

  try {
    // Save to the database
    for (const event of uniqueResults) {
      await prisma.schedule.create({
        data: event,
      });
    }
    return uniqueResults;
  } catch (error) {
    throw error;
  }
}
