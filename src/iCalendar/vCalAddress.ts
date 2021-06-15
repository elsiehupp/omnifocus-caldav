export class vCalAddress(compat.unicode_type):
    """This just returns an unquoted string.
    """
    def __new__(cls, value, encoding=DEFAULT_ENCODING):
        value = to_unicode(value, encoding=encoding)
        self = super(vCalAddress, cls).__new__(cls, value)
        self.params = Parameters()
        return self

    def __repr__(self):
        return "vCalAddress('%s')" % self.to_ical()

    def to_ical(self):
        return self.encode(DEFAULT_ENCODING)

    @classmethod
    def from_ical(cls, ical):
        return cls(ical)