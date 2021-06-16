export class vRecur(CaselessDict):
    """Recurrence definition.
    """

    frequencies = ["SECONDLY", "MINUTELY", "HOURLY", "DAILY", "WEEKLY",
                   "MONTHLY", "YEARLY"]

    // Mac iCal ignores RRULEs where FREQ is not the first rule part.
    // Sorts parts according to the order listed in RFC 5545, section 3.3.10.
    canonical_order = ("FREQ", "UNTIL", "COUNT", "INTERVAL",
                       "BYSECOND", "BYMINUTE", "BYHOUR", "BYDAY",
                       "BYMONTHDAY", "BYYEARDAY", "BYWEEKNO", "BYMONTH",
                       "BYSETPOS", "WKST")

    types = CaselessDict({
        'COUNT': vInt,
        'INTERVAL': vInt,
        'BYSECOND': vInt,
        'BYMINUTE': vInt,
        'BYHOUR': vInt,
        'BYWEEKNO': vInt,
        'BYMONTHDAY': vInt,
        'BYYEARDAY': vInt,
        'BYMONTH': vInt,
        'UNTIL': vDDDTypes,
        'BYSETPOS': vInt,
        'WKST': vWeekday,
        'BYDAY': vWeekday,
        'FREQ': vFrequency,
    })

    def __init__(self, *args, **kwargs):
        super(vRecur, self).__init__(*args, **kwargs)
        self.params = Parameters()

    def to_ical(self):
        result = []
        for key, vals in self.sorted_items():
            typ = self.types.get(key, vText)
            if not isinstance(vals, SEQUENCE_TYPES):
                vals = [vals]
            vals = b','.join(typ(val).to_ical() for val in vals)

            // CaselessDict keys are always unicode
            key = key.encode(DEFAULT_ENCODING)
            result.append(key + b'=' + vals)

        return b';'.join(result)

    @classmethod
    def parse_type(cls, key, values):
        // integers
        parser = cls.types.get(key, vText)
        return [parser.from_ical(v) for v in values.split(',')]

    @classmethod
    def from_ical(cls, ical):
        if isinstance(ical, cls):
            return ical
        try:
            recur = cls()
            for pairs in ical.split(';'):
                try:
                    key, vals = pairs.split('=')
                except ValueError:
                    // E.g. incorrect trailing semicolon, like (issue /157):
                    // FREQ=YEARLY;BYMONTH=11;BYDAY=1SU;
                    continue
                recur[key] = cls.parse_type(key, vals)
            return dict(recur)
        except:
            console.error('ValueError: Error in recurrence rule: %s' % ical)