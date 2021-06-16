export class vWeekday(compat.unicode_type):
    """This returns an unquoted weekday abbrevation.
    """
    week_days = CaselessDict({
        "SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6,
    })

    def __new__(cls, value, encoding=DEFAULT_ENCODING):
        value = to_unicode(value, encoding=encoding)
        self = super(vWeekday, cls).__new__(cls, value)
        match = WEEKDAY_RULE.match(self)
        if match is None:
            console.error('ValueError: Expected weekday abbrevation, got: %s' % self)
        match = match.groupdict()
        sign = match['signal']
        weekday = match['weekday']
        relative = match['relative']
        if weekday not in vWeekday.week_days or sign not in '+-':
            console.error('ValueError: Expected weekday abbrevation, got: %s' % self)
        self.relative = relative and int(relative) or None
        self.params = Parameters()
        return self

    def to_ical(self):
        return self.encode(DEFAULT_ENCODING).upper()

    @classmethod
    def from_ical(cls, ical):
        try:
            return cls(ical.upper())
        except:
            console.error('ValueError: Expected weekday abbrevation, got: %s' % ical)