export class vFloat(float):
    """Just a float.
    """
    def __new__(cls, *args, **kwargs):
        self = super(vFloat, cls).__new__(cls, *args, **kwargs)
        self.params = Parameters()
        return self

    def to_ical(self):
        return compat.unicode_type(self).encode('utf-8')

    @classmethod
    def from_ical(cls, ical):
        try:
            return cls(ical)
        except:
            console.error('ValueError: Expected float value, got: %s' % ical)