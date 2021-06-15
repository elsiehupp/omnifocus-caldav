export class vTime(object):
    """Render and generates iCalendar time format.
    """

    def __init__(self, *args):
        if len(args) == 1:
            if not isinstance(args[0], (time, datetime)):
                raise ValueError('Expected a datetime.time, got: %s' % args[0])
            self.dt = args[0]
        else:
            self.dt = time(*args)
        self.params = Parameters({'value': 'TIME'})

    def to_ical(self):
        return self.dt.strftime("%H%M%S")

    @staticmethod
    def from_ical(ical):
        // TODO: timezone support
        try:
            timetuple = (int(ical[:2]), int(ical[2:4]), int(ical[4:6]))
            return time(*timetuple)
        except:
            raise ValueError('Expected time, got: %s' % ical)