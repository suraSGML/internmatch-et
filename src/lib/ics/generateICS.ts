/**
 * Generates an RFC 5545 compliant .ics file string for a calendar event.
 * Used for interview invitations.
 */

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export interface ICSEventOptions {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  /** Duration in minutes. Defaults to 60. */
  durationMinutes?: number;
  organizerEmail?: string;
  organizerName?: string;
  attendeeEmail?: string;
}

export function generateICS(options: ICSEventOptions): string {
  const {
    uid,
    title,
    description = '',
    location = '',
    startDate,
    durationMinutes = 60,
    organizerEmail,
    organizerName,
    attendeeEmail,
  } = options;

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InternMatch ET//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}@internmatch.et`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeICSText(description)}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeICSText(location)}`);
  }
  if (organizerEmail) {
    const cn = organizerName ? `;CN=${organizerName}` : '';
    lines.push(`ORGANIZER${cn}:MAILTO:${organizerEmail}`);
  }
  if (attendeeEmail) {
    lines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${attendeeEmail}`
    );
  }

  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');

  // RFC 5545 line folding: lines must not exceed 75 octets
  return lines
    .map((line) => {
      if (line.length <= 75) return line;
      const chunks: string[] = [];
      let remaining = line;
      while (remaining.length > 75) {
        chunks.push(remaining.slice(0, 75));
        remaining = ' ' + remaining.slice(75);
      }
      chunks.push(remaining);
      return chunks.join('\r\n');
    })
    .join('\r\n');
}
