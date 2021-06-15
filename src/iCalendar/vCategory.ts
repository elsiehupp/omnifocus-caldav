export class vCategory(object):

    def __init__(self, c_list):
        if not hasattr(c_list, '__iter__'):
            d_list = [c_list]
        self.cats = [vText(c) for c in c_list]

    def to_ical(self):
        return b",".join([c.to_ical() for c in self.cats])

    @staticmethod
    def from_ical(ical, timezone=None):
        out = unescape_char(ical).split(",")
        return out