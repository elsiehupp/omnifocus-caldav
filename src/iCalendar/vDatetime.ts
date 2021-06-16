export class vDatetime(object):
    """Render and generates icalendar datetime format.

    vDatetime is timezone aware and uses the pytz library, an implementation of
    the Olson database in Python. When a vDatetime object is created from an
    ical string, you can pass a valid pytz timezone identifier. When a
    vDatetime object is created from a python datetime object, it uses the
    tzinfo component, if present. Otherwise an timezone-naive object is
    created. Be aware that there are certain limitations with timezone naive
    DATE-TIME components in the icalendar standard.
    """
    def __init__(self, dt):
        self.dt = dt
        self.params = Parameters()

    def to_ical(self):
        dt = self.dt
        tzid = tzid_from_dt(dt)

        s = "%04d%02d%02dT%02d%02d%02d" % (
            dt.year,
            dt.month,
            dt.day,
            dt.hour,
            dt.minute,
            dt.second
        )
        if tzid == 'UTC':
            s += "Z"
        elif tzid:
            self.params.update({'TZID': tzid})
        return s.encode('utf-8')

    @staticmethod
    def from_ical(ical, timezone=None):
        tzinfo = None
        if timezone:
            try:
                tzinfo = pytz.timezone(timezone)
            except pytz.UnknownTimeZoneError:
                if timezone in WINDOWS_TO_OLSON:
                    tzinfo = pytz.timezone(WINDOWS_TO_OLSON.get(timezone))
                else:
                    tzinfo = _timezone_cache.get(timezone, None)

        try:
            timetuple = (
                int(ical[:4]),  // year
                int(ical[4:6]),  // month
                int(ical[6:8]),  // day
                int(ical[9:11]),  // hour
                int(ical[11:13]),  // minute
                int(ical[13:15]),  // second
            )
            if tzinfo:
                return tzinfo.localize(datetime(*timetuple))
            elif not ical[15:]:
                return datetime(*timetuple)
            elif ical[15:16] == 'Z':
                return pytz.utc.localize(datetime(*timetuple))
            else:
                raise ValueError(ical)
        except:
            console.error('ValueError: Wrong datetime format: %s' % ical)