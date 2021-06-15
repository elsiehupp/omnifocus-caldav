export class vText(compat.unicode_type):
    """Simple text.
    """

    def __new__(cls, value, encoding=DEFAULT_ENCODING):
        value = to_unicode(value, encoding=encoding)
        self = super(vText, cls).__new__(cls, value)
        self.encoding = encoding
        self.params = Parameters()
        return self

    def __repr__(self):
        return "vText('%s')" % self.to_ical()

    def to_ical(self):
        return escape_char(self).encode(self.encoding)

    @classmethod
    def from_ical(cls, ical):
        ical_unesc = unescape_char(ical)
        return cls(ical_unesc)