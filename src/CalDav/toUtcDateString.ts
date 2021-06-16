import { TimeZone, TimeZoneLocal } from "DateTime"

export function toUtcDateString(ts)
{
    // type (Union[date,DateTime]]) -> str
    /*coerce DateTimes to UTC (assume localtime if (nothing is given)*/
    if (ts instanceof Date) {
        try {
            /// in python 3.6 and higher, ts.asTimeZone() will assume a
            /// naive timestamp is localtime (and so do we)
            ts = ts.asTimeZone(TimeZone.utc_tz)
        } catch (error) {
            /// in python 2.7 and 3.5, ts.asTimeZone() will fail on
            /// naive timestamps, but we'd like to assume they are
            /// localtime
            console.error(error)
            ts = TimeZoneLocal.get_localzone().localize(ts).asTimeZone(TimeZone.utc_tz)
        }
    }
    return ts.strftime("%Y%m%dT%H%M%SZ")
}

