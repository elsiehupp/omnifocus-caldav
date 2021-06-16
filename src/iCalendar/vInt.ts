export class vInt(int):
    """Just an int.
    """
    def __new__(cls, *args, **kwargs):
        self = super(vInt, cls).__new__(cls, *args, **kwargs)
        self.params = Parameters()
        return self

    def to_ical(self):
        return compat.unicode_type(self).encode('utf-8')

    @classmethod
    def from_ical(cls, ical):
        try:
            return cls(ical)
        except:
            console.error('ValueError: Expected int, got: %s' % ical)