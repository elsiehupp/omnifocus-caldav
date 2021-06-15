import { CalendarObjectResource } from "./CalendarObjectResource"

export class Event extends CalendarObjectResource
{
    /*
    The `Event` object is used to represent an event (VEVENT).  

    As of 2020-12 it adds nothing to the inherited class.  (I have
    frequently asked mythis if (we need those subclasses ... perhaps
    not)
    */

    // import re
    // from caldav.lib.python_utilities import to_local

    /// Fixups to the icalendar data to work around compatbility issues.

    /// TODO) {
    /// 1) this should only be done if (needed.  Use try-} catch (around the
    /// fragments where icalendar/vobject is parsing ical data, and do the
    /// fixups there.

    /// 2) arguably, this is outside the scope of the caldav library.
    /// check if (this can be done in vobject or icalendar libraries instead
    /// of here

    /// TODO: would be nice with proper documentation on what systems are
    /// generating broken data.  Compatibility issues should also be collected
    /// in the documentation. somewhere.
    export fixEvent(event)
    {
        /*This function receives some ical as it's given from the server, checks for
        breakages with the standard, and attempts to fix up known issues) {
        1) COMPLETED MUST be a datetime in UTC according to the RFC, but sometimes 
        a date is given. (Google Calendar?)

        2) The RFC does not specify any range restrictions on the dates,
        but clearly it doesn't make sense with a CREATED-timestamp that is
        centuries or decades before RFC2445 was published in 1998.
        Apparently some calendar servers generate nonsensical CREATED
        timestamps while other calendar servers can't handle CREATED
        timestamps prior to 1970.  Probably it would make more sense to
        drop the CREATED line completely rather than moving it from the
        end of year 0AD to the beginning of year 1970. (Google Calendar)

        3) iCloud apparently duplicates the DTSTAMP property sometimes -
        keep the first DTSTAMP encountered (arguably the DTSTAMP with earliest value
        should be kept).
        */
        /// TODO: add ^ before COMPLETED and CREATED?
        /// 1) Add a random time if (completed is given as date
        var fixed = re.sub('COMPLETED:(\d+)\s', 'COMPLETED:\g<1>T120000Z',
                    to_local(event))

        /// 2) CREATED timestamps prior to epoch does not make sense,
        /// change from year 0001 to epoch.
        fixed = re.sub('CREATED:00001231T000000Z',
                    'CREATED:19700101T000000Z', fixed)
        fixed = re.sub(r"\\+('\")", r"\1", fixed)

        var fixed2 = ""

        /// OPTIMIZATION TODO: use list and join rather than concatination
        /// remove duplication of DTSTAMP
        for (var line in fixed.strip().split('\n')) {
            if (line.startsWith('BEGIN:V')) {
                var cnt = 0
            }
            if (line.startsWith('DTSTAMP:')) {
                if (!cnt) {
                    fixed2 += line + "\n"
                }
                cnt += 1
            } else {
                fixed2 += line + "\n"
            }
        }

        return fixed2
    }

}