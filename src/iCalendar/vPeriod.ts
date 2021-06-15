export class vPeriod(object):
    """A precise period of time.
    """
    def __init__(self, per):
        start, end_or_duration = per
        if not (isinstance(start, datetime) or isinstance(start, date)):
            raise ValueError('Start value MUST be a datetime or date instance')
        if not (isinstance(end_or_duration, datetime) or
                isinstance(end_or_duration, date) or
                isinstance(end_or_duration, timedelta)):
            raise ValueError('end_or_duration MUST be a datetime, '
                             'date or timedelta instance')
        by_duration = 0
        if isinstance(end_or_duration, timedelta):
            by_duration = 1
            duration = end_or_duration
            end = start + duration
        else:
            end = end_or_duration
            duration = end - start
        if start > end:
            raise ValueError("Start time is greater than end time")

        self.params = Parameters()
        // set the timezone identifier
        // does not support different timezones for start and end
        tzid = tzid_from_dt(start)
        if tzid:
            self.params['TZID'] = tzid

        self.start = start
        self.end = end
        self.by_duration = by_duration
        self.duration = duration

    def __cmp__(self, other):
        if not isinstance(other, vPeriod):
            raise NotImplementedError('Cannot compare vPeriod with %r' % other)
        return cmp((self.start, self.end), (other.start, other.end))

    def overlaps(self, other):
        if self.start > other.start:
            return other.overlaps(self)
        if self.start <= other.start < self.end:
            return True
        return False

    def to_ical(self):
        if self.by_duration:
            return (vDatetime(self.start).to_ical() + b'/' +
                    vDuration(self.duration).to_ical())
        return (vDatetime(self.start).to_ical() + b'/' +
                vDatetime(self.end).to_ical())

    @staticmethod
    def from_ical(ical):
        try:
            start, end_or_duration = ical.split('/')
            start = vDDDTypes.from_ical(start)
            end_or_duration = vDDDTypes.from_ical(end_or_duration)
            return (start, end_or_duration)
        except:
            raise ValueError('Expected period format, got: %s' % ical)

    def __repr__(self):
        if self.by_duration:
            p = (self.start, self.duration)
        else:
            p = (self.start, self.end)
        return 'vPeriod(%r)' % (p, )