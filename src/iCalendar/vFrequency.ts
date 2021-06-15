export class vFrequency(compat.unicode_type):
    """A simple class that catches illegal values.
    """

    frequencies = CaselessDict({
        "SECONDLY": "SECONDLY",
        "MINUTELY": "MINUTELY",
        "HOURLY": "HOURLY",
        "DAILY": "DAILY",
        "WEEKLY": "WEEKLY",
        "MONTHLY": "MONTHLY",
        "YEARLY": "YEARLY",
    })

    def __new__(cls, value, encoding=DEFAULT_ENCODING):
        value = to_unicode(value, encoding=encoding)
        self = super(vFrequency, cls).__new__(cls, value)
        if self not in vFrequency.frequencies:
            raise ValueError('Expected frequency, got: %s' % self)
        self.params = Parameters()
        return self

    def to_ical(self):
        return self.encode(DEFAULT_ENCODING).upper()

    @classmethod
    def from_ical(cls, ical):
        try:
            return cls(ical.upper())
        except:
            raise ValueError('Expected frequency, got: %s' % ical)