export type Slot = {
  time: string;
  status: 'AVAILABLE' | 'WALK-INS' | 'BLOCKED' | 'CLEANUP' | 'SCHEDULED';
  attendeeId?: string;
  code?: string;
  verified?: boolean;
  assignedSuite?: boolean;
  walkIn?: boolean;
};

export type DaySchedule = {
  day: string;
  slots: Slot[];
};

export type StaffAssignmentForMultiSelect = {
  value: string; // will represent the id
  label: string; // will represent Team Member name
};

/**
 * Asynchronously saves the suite schedule to the database.
 *
 * This function sends a POST request to the server with the suite schedule data
 * in the request body. The server endpoint is determined by the `hostId`.
 *
 * @async
 * @function saveSuiteScheule
 * @throws Will throw an error if the fetch request fails.
 */
export const saveSuiteSchedule = async (hostId: string, suiteSchedule: DaySchedule[]) => {
  // Save suite schedule to the database
  try {
    const response = await fetch(`/api/hosts/${hostId}/suite-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suiteSchedule }),
    });
    const updatedSchedule = await response.json();
    return updatedSchedule;
  } catch (error) {
    console.error('Error saving suite schedule:', error);
  }
};

/**
 * Updates the status of a specific slot in the schedule for a given day.
 *
 * @param prevSchedule - The previous schedule array containing day schedules.
 * @param day - The day for which the slot status needs to be updated.
 * @param index - The index of the slot within the day's schedule to update.
 * @param status - The new status to set for the specified slot.
 * @param staffAssignment - The staff assignment for the specified slot.
 * @returns A new schedule array with the updated slot status for the specified day.
 */
export const updateScheduleEntry = (
  prevSchedule: DaySchedule[],
  day: string,
  index: number,
  status: Slot['status'],
  staffAssignment?: StaffAssignmentForMultiSelect[]
) => {
  console.log('updateScheduleEntry', day, index, status, staffAssignment);

  return prevSchedule.map((d) =>
    d.day === day
      ? {
          ...d,
          slots: d.slots.map((slot, i) =>
            i === index ? { ...slot, status, staffAssignment } : slot
          ),
        }
      : d
  );
};

/**
 * Calculates the number of available, walk-in, blocked, scheduled, and cleanup slots in the schedule.
 *
 * @param schedule - The schedule array containing day schedules.
 * @returns An object with the count of each slot status.
 */
export const getScheduleStats = (schedule: DaySchedule[]) => {
  const noSchedule = !schedule || schedule.length === 0;
  const stats = {
    available: 0,
    walkIns: noSchedule ? 3 : 0,
    blocked: 0,
    cleanup: noSchedule ? 2 : 0,
    scheduled: 0,
  };

  console.log('schedule', schedule);

  if (noSchedule) {
    return stats;
  }

  schedule?.forEach((day) => {
    day.slots.forEach((slot) => {
      if (slot.status === 'AVAILABLE') {
        stats.available++;
      } else if (slot.status === 'WALK-INS') {
        stats.walkIns++;
      } else if (slot.status === 'BLOCKED') {
        stats.blocked++;
      } else if (slot.status === 'CLEANUP') {
        stats.cleanup++;
      } else if (slot.status === 'SCHEDULED') {
        stats.scheduled++;
      }
    });
  });

  return stats;
};

// Add these new types and functions at the end of the file

export type ConferenceEvent = {
  time: string;
  description: string;
};

export type ConferenceSchedule = {
  day: string;
  events: ConferenceEvent[];
};

export const fetchConferenceSchedule = async (): Promise<ConferenceSchedule[]> => {
  try {
    const response = await fetch('/api/schedule');
    if (!response.ok) {
      throw new Error('Failed to fetch conference schedule');
    }
    const data = await response.json();

    // Transform the data into the required format
    return transformScheduleDataFromDatabase(data);
  } catch (error) {
    console.error('Error fetching conference schedule:', error);
    throw error;
  }
};

export const transformScheduleData = (data: any[]): ConferenceSchedule[] => {
  const scheduleMap = new Map<string, ConferenceEvent[]>();

  data.forEach((item) => {
    const day = new Date(item.startTime).toLocaleDateString('en-US', { weekday: 'long' });
    const event = {
      time: new Date(item.startTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      description: item.description,
    };

    if (!scheduleMap.has(day)) {
      scheduleMap.set(day, []);
    }
    scheduleMap.get(day)!.push(event);
  });

  return Array.from(scheduleMap.entries()).map(([day, events]) => ({ day, events }));
};

/**
 * Transforms the schedule data from the database into the required format.
 * @param data
 * @returns
 */
export const transformScheduleDataFromDatabase = (data: any[]): ConferenceSchedule[] => {
  const scheduleMap = new Map<string, ConferenceEvent[]>();

  data.forEach((item) => {
    const day = item.date;

    const event = {
      time: item.time,
      description: item.session,
    };

    if (!scheduleMap.has(day)) {
      scheduleMap.set(day, []);
    }
    scheduleMap.get(day)!.push(event);
  });

  return Array.from(scheduleMap.entries()).map(([day, events]) => ({ day, events }));
};

/**
 * Calculates the total number of slots in the schedule.
 * Ignores the CLEANUP slot status.
 * @param schedule
 * @returns
 */
export const getTotalSlots = (schedule: DaySchedule[]) => {
  let total = 0;
  schedule?.forEach((day) => {
    total += day.slots?.filter((slot) => slot.status !== 'CLEANUP').length;
  });
  return total;
};

export type HostStats = {
  id: string;
  suiteSchedule: DaySchedule[];
};

export type ConferenceStats = {
  totalAttendees: number;
  totalHosts: number;
  totalSessions: number;
  totalUsers: number;
  totalHostsStats: HostStats[];
};

/**
 * Calculates the total number of sessions booked by all hosts with SCHEDULED status.
 * @param hostsStats
 * @returns
 */
export const getTotalBookedSessions = (hostsStats: HostStats[]) => {
  let totalBlocked = 0;
  if (hostsStats && Array.isArray(hostsStats)) {
    for (const host of hostsStats) {
      if (host.suiteSchedule && Array.isArray(host.suiteSchedule)) {
        for (const day of host.suiteSchedule) {
          if (day.slots && Array.isArray(day.slots)) {
            totalBlocked += day.slots.filter((slot) => slot.status === 'SCHEDULED').length;
          }
        }
      }
    }
  }
  return totalBlocked;
};
