export class vGeo(object):
    """A special type that is only indirectly defined in the rfc.
    """

    def __init__(self, geo):
        try:
            latitude, longitude = (geo[0], geo[1])
            latitude = float(latitude)
            longitude = float(longitude)
        except:
            raise ValueError('Input must be (float, float) for '
                             'latitude and longitude')
        self.latitude = latitude
        self.longitude = longitude
        self.params = Parameters()

    def to_ical(self):
        return '%s;%s' % (self.latitude, self.longitude)

    @staticmethod
    def from_ical(ical):
        try:
            latitude, longitude = ical.split(';')
            return (float(latitude), float(longitude))
        except:
            raise ValueError("Expected 'float;float' , got: %s" % ical)