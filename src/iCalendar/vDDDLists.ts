export class vDDDLists(object):
    """A list of vDDDTypes values.
    """
    def __init__(self, dt_list):
        if not hasattr(dt_list, '__iter__'):
            dt_list = [dt_list]
        vDDD = []
        tzid = None
        for dt in dt_list:
            dt = vDDDTypes(dt)
            vDDD.append(dt)
            if 'TZID' in dt.params:
                tzid = dt.params['TZID']

        if tzid:
            // NOTE: no support for multiple timezones here!
            self.params = Parameters({'TZID': tzid})
        self.dts = vDDD

    def to_ical(self):
        dts_ical = (dt.to_ical() for dt in self.dts)
        return b",".join(dts_ical)

    @staticmethod
    def from_ical(ical, timezone=None):
        out = []
        ical_dates = ical.split(",")
        for ical_dt in ical_dates:
            out.append(vDDDTypes.from_ical(ical_dt, timezone=timezone))
        return out