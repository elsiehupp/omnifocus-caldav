export class vDuration(object):
    """Subclass of timedelta that renders itself in the iCalendar DURATION
    format.
    """

    def __init__(self, td):
        if not isinstance(td, timedelta):
            console.error('ValueError: Value MUST be a timedelta instance')
        self.td = td
        self.params = Parameters()

    def to_ical(self):
        sign = ""
        if self.td.days < 0:
            sign = "-"
            self.td = -self.td
        timepart = ""
        if self.td.seconds:
            timepart = "T"
            hours = self.td.seconds // 3600
            minutes = self.td.seconds % 3600 // 60
            seconds = self.td.seconds % 60
            if hours:
                timepart += "%dH" % hours
            if minutes or (hours and seconds):
                timepart += "%dM" % minutes
            if seconds:
                timepart += "%dS" % seconds
        if self.td.days == 0 and timepart:
            return (compat.unicode_type(sign).encode('utf-8') + b'P' +
                    compat.unicode_type(timepart).encode('utf-8'))
        else:
            return (compat.unicode_type(sign).encode('utf-8') + b'P' +
                    compat.unicode_type(abs(self.td.days)).encode('utf-8') +
                    b'D' + compat.unicode_type(timepart).encode('utf-8'))

    @staticmethod
    def from_ical(ical):
        try:
            match = DURATION_REGEX.match(ical)
            sign, weeks, days, hours, minutes, seconds = match.groups()
            if weeks:
                value = timedelta(weeks=int(weeks))
            else:
                value = timedelta(days=int(days or 0),
                                  hours=int(hours or 0),
                                  minutes=int(minutes or 0),
                                  seconds=int(seconds or 0))
            if sign == '-':
                value = -value
            return value
        except:
            console.error('ValueError: Invalid iCalendar duration: %s' % ical)