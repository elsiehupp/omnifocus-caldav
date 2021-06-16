export class vBinary
{
    """Binary property values are base 64 encoded.
    """

    def __init__(self, obj):
        self.obj = to_unicode(obj)
        self.params = Parameters(encoding='BASE64', value="BINARY")

    def __repr__(self):
        return "vBinary('%s')" % self.to_ical()

    def to_ical(self):
        return binascii.b2a_base64(self.obj.encode('utf-8'))[:-1]

    @staticmethod
    def from_ical(ical):
        try:
            return base64.b64decode(ical)
        except UnicodeError:
            console.error('ValueError: Not valid base 64 encoding.')
}