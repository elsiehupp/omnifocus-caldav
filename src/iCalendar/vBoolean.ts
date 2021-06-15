export class vBoolean(int):
    /*Returns specific string according to state.
    */
    BOOL_MAP = CaselessDict({'true': True, 'false': False})

    def __new__(cls, *args, **kwargs):
        self = super(vBoolean, cls).__new__(cls, *args, **kwargs)
        self.params = Parameters()
        return self

    def to_ical(self):
        if self:
            return b'TRUE'
        return b'FALSE'

    @classmethod
    def from_ical(cls, ical):
        try:
            return cls.BOOL_MAP[ical]
        except:
            raise ValueError("Expected 'TRUE' or 'FALSE'. Got %s" % ical)