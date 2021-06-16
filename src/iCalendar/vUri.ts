export class vUri(compat.unicode_type):
    """Uniform resource identifier is basically just an unquoted string.
    """

    def __new__(cls, value, encoding=DEFAULT_ENCODING):
        value = to_unicode(value, encoding=encoding)
        self = super(vUri, cls).__new__(cls, value)
        self.params = Parameters()
        return self

    def to_ical(self):
        return self.encode(DEFAULT_ENCODING)

    @classmethod
    def from_ical(cls, ical):
        try:
            return cls(ical)
        except:
            console.error('ValueError: Expected , got: %s' % ical)