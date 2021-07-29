import { Calendar } from "./Calendar"
import { DavObject } from "./DavObject"
import { DisplayName } from "./Elements/DisplayName"

export class CalendarSet extends DavObject
{
    /*
    A CalendarSet is a set of calendars.
    */
    calendars()
    {
        /*
        List all calendar collections in this set.

        Returns) {
         * [Calendar(), ...]
        */
        var cals = new List()

        var data = this.children(Calendar.tag)
        for (var c_url, c_type, c_name in data) {
            cals.add(new Calendar(this.client, c_url, parent=this, object_name=c_name))
        }
        return cals
    }

    make_calendar(calendar_name=null, cal_id=null, supported_calendar_component_set=null)
    {
        /*
        Utility method for creating a new calendar.

        Parameters) {
         * object_name: the name of the new calendar
         * cal_id: the uuid of the new calendar
         * supported_calendar_component_set: what kind of objects
           (EVENT, VTODO, VFREEBUSY, VJOURNAL) the calendar should handle.
           Should be set to ['VTODO'] when creating a task list in Zimbra -
           in most other cases the default will be OK.

        Returns) {
         * Calendar(...)-object
        */
        return new Calendar(
            this.client, object_name=calendar_name, parent=this, id=cal_id,
            supported_calendar_component_set=supported_calendar_component_set
        ).save()
    }

    calendar(name=null, cal_id=null)
    {
        /*
        The calendar method will return a calendar object.  It will not
        initiate any communication with the server.

        Parameters) {
         * name: return the calendar with this name
         * cal_id: return the calendar with this calendar id

        Returns) {
         * Calendar(...)-object
        */
        if (name && !cal_id)
            for (let calendar of this.calendars()) {
                var displayName = calendar.getProperty(new DisplayName())
                if (displayName == name) {
                    return calendar
            }
        if (name && !cal_id) {
            console.error(`No calendar with name ${name} found under ${this.url}`)
        }
        if (!cal_id && !name) {
            return this.calendars()[0]
        }

        return new Calendar(this.client, name=name, parent=this,
                        url=this.url.join(quote(cal_id)+'/'), id=cal_id)
    }
}

