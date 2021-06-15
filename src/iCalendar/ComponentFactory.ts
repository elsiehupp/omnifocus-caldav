import { CaselessDict } from "./CaselessDict"

class ComponentFactory extends CaselessDict
{
    /*All components defined in rfc 2445 are registered in this factory class.
    To get a component you can use it like this.
    */

    def __init__(self, *args, **kwargs):
        /*Set keys to upper for initial dict.
        */
        super(ComponentFactory, self).__init__(*args, **kwargs)
        self['VEVENT'] = Event
        self['VTODO'] = Todo
        self['VJOURNAL'] = Journal
        self['VFREEBUSY'] = FreeBusy
        self['VTIMEZONE'] = Timezone
        self['STANDARD'] = TimezoneStandard
        self['DAYLIGHT'] = TimezoneDaylight
        self['VALARM'] = Alarm
        self['VCALENDAR'] = Calendar
}