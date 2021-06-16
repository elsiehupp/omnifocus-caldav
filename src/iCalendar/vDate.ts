export class vDate(object):
    """Render and generates iCalendar date format.
    """
    def __init__(self, dt):
        if not isinstance(dt, date):
            console.error('ValueError: Value MUST be a date instance')
        self.dt = dt
        self.params = Parameters({'value': 'DATE'})

    def to_ical(self):
        s = "%04d%02d%02d" % (self.dt.year, self.dt.month, self.dt.day)
        return s.encode('utf-8')

    @staticmethod
    def from_ical(ical):
        try:
            timetuple = (
                int(ical[:4]),  // year
                int(ical[4:6]),  // month
                int(ical[6:8]),  // day
            )
            return date(*timetuple)
        except:
            console.error('ValueError: Wrong date format %s' % ical)