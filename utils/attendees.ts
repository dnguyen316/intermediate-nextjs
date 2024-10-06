import 'server-only';
import { db } from '@/db/db';
import { attendees, events, rsvps } from '@/db/schema';
import { eq, SQL, sql } from 'drizzle-orm';
import { delay } from './delay';
import { memoize } from 'nextjs-better-unstable-cache';

export const getGuestList = memoize(
  async (userId: string) => {
    await delay();

    return await db
      .selectDistinct({
        id: attendees.id,
        name: attendees.name,
        email: attendees.email,
      })
      .from(events)
      .leftJoin(rsvps, eq(rsvps.eventId, events.id))
      .leftJoin(attendees, eq(attendees.id, rsvps.attendeeId))
      .where(eq(events.createdById, userId))
      .execute();
  },
  {
    persist: true,
    revalidateTags: () => ['guests'],
    suppressWarnings: true,
    log: ['datacache', 'verbose'],
    logid: 'guests',
  }
);

export const getAttendeesCountForDashboard = memoize(
  async (userId: string) => {
    await delay();

    const counts: { totalAttendees: number }[] = await db
      .select({
        totalAttendees: sql`COUNT(DISTINCT ${attendees.id})` as SQL<number>,
      })
      .from(events)
      .leftJoin(rsvps, eq(rsvps.eventId, events.id))
      .leftJoin(attendees, eq(attendees.id, rsvps.attendeeId))
      .where(eq(events.createdById, userId))
      .groupBy(events.id)
      .execute();

    const total = counts.reduce((acc, count) => acc + count.totalAttendees, 0);
    return total;
  },
  {
    persist: true,
    revalidateTags: () => ['dashboard:attendees'],
    suppressWarnings: true,
    log: ['datacache', 'verbose', 'dedupe'],
    logid: 'dashboard:attendees',
  }
);
