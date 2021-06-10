export class CalendarSet extends DavObject
{
    """
    A CalendarSet is a set of calendars.
    """
    calendars():
        """
        List all calendar collections in this set.

        Returns:
         * [Calendar(), ...]
        """
        cals = []

        data = this.children(cdav.Calendar.tag)
        for c_url, c_type, c_name in data:
            cals.append(Calendar(this.client, c_url, parent=this, name=c_name))

        return cals

    make_calendar(name=null, cal_id=null,
                      supported_calendar_component_set=null):
        """
        Utility method for creating a new calendar.

        Parameters:
         * name: the name of the new calendar
         * cal_id: the uuid of the new calendar
         * supported_calendar_component_set: what kind of objects
           (EVENT, VTODO, VFREEBUSY, VJOURNAL) the calendar should handle.
           Should be set to ['VTODO'] when creating a task list in Zimbra -
           in most other cases the default will be OK.

        Returns:
         * Calendar(...)-object
        """
        return Calendar(
            this.client, name=name, parent=this, id=cal_id,
            supported_calendar_component_set=supported_calendar_component_set
        ).save()

    calendar(name=null, cal_id=null):
        """
        The calendar method will return a calendar object.  It will not
        initiate any communication with the server.

        Parameters:
         * name: return the calendar with this name
         * cal_id: return the calendar with this calendar id

        Returns:
         * Calendar(...)-object
        """
        if name and not cal_id:
            for calendar in this.calendars():
                display_name = calendar.get_property(dav.DisplayName())
                if display_name == name:
                    return calendar
        if name and not cal_id:
            raise error.NotFoundError("No calendar with name %s found under %s" % (name, this.url))
        if not cal_id and not name:
            return this.calendars()[0]

        return Calendar(this.client, name=name, parent=this,
                        url=this.url.join(quote(cal_id)+'/'), id=cal_id)
}

