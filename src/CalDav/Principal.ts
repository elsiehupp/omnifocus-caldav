export class Principal extends DavObject
    """
    This class represents a DAV Principal. It doesn't do much, except
    keep track of the URLs for the calendar-home-set, etc.

    A principal MUST have a non-empty DAV:displayname property
    (defined in Section 13.2 of [RFC2518]),
    and a DAV:resourcetype property (defined in Section 13.9 of [RFC2518]).
    Additionally, a principal MUST report the DAV:principal XML element
    in the value of the DAV:resourcetype property.

    (TODO: the resourcetype is actually never checked, and the DisplayName 
    is not stored anywhere)
    """
    constructor(client=null, url=null):
        """
        Returns a Principal.

        Parameters:
         * client: a DavClient() oject
         * url: Deprecated - for backwards compatibility purposes only.

        If url is not given, deduct principal path as well as calendar home set
        path from doing propfinds.
        """
        super(Principal, this).constructor(client=client, url=url)
        this._calendar_home_set = null

        if url is null:
            this.url = this.client.url
            cup = this.get_property(dav.CurrentUserPrincipal())
            this.url = this.client.url.join(
                URL.objectify(cup))

    make_calendar(name=null, cal_id=null,
                      supported_calendar_component_set=null):
        """
        Convenience method, bypasses the this.calendar_home_set object.
        See CalendarSet.make_calendar for details.
        """
        return this.calendar_home_set.make_calendar(
            name, cal_id,
            supported_calendar_component_set=supported_calendar_component_set)

    calendar(name=null, cal_id=null):
        """
        The calendar method will return a calendar object.
        It will not initiate any communication with the server.
        """
        return this.calendar_home_set.calendar(name, cal_id)

    get_vcal_address():
        """
        Returns the principal, as an icalendar.vCalAddress object
        """
        /// Late import.  Prior to 1.0, icalendar is only an optional dependency.
        from icalendar import vCalAddress, vText
        cn = this.get_property(dav.DisplayName())
        ids = this.calendar_user_address_set()
        cutype = this.get_property(cdav.CalendarUserType())
        ret = vCalAddress(ids[0])
        ret.params['cn'] = vText(cn)
        ret.params['cutype'] = vText(cutype)
        return ret

    @property
    calendar_home_set():
        if not this._calendar_home_set:
            this.calendar_home_set = this.get_property(cdav.CalendarHomeSet())
        return this._calendar_home_set

    @calendar_home_set.setter
    calendar_home_set(url):
        if isinstance(url, CalendarSet):
            this._calendar_home_set = url
            return
        sanitized_url = URL.objectify(url)
        /// TODO: sanitized_url should never be null, this needs more
        /// research.  added here as it solves real-world issues, ref
        /// https://github.com/python-caldav/caldav/pull/56
        if sanitized_url is not null:
            if (sanitized_url.hostname and
                sanitized_url.hostname != this.client.url.hostname):
                // icloud (and others?) having a load balanced system,
                // where each principal resides on one named host
                /// TODO:
                /// Here be dragons.  sanitized_url will be the root
                /// of all future objects derived from client.  Changing
                /// the client.url root by doing a principal.calendars()
                /// is an unacceptable side effect and may be a cause of
                /// incompatibilities with icloud.  Do more research!
                this.client.url = sanitized_url
        this._calendar_home_set = CalendarSet(
            this.client, this.client.url.join(sanitized_url))

    calendars():
        """
        Return the principials calendars
        """
        return this.calendar_home_set.calendars()

    freebusy_request(dtstart, dtend, attendees):
        import icalendar
        freebusy_ical = icalendar.Calendar()
        freebusy_ical.add('prodid', '-//tobixen/python-caldav//EN')
        freebusy_ical.add('version', '2.0')
        freebusy_ical.add('method', 'REQUEST')
        uid = uuid.uuid1()
        freebusy_comp = icalendar.FreeBusy()
        freebusy_comp.add('uid', uid)
        freebusy_comp.add('dtstamp', datetime.now())
        freebusy_comp.add('dtstart', dtstart)
        freebusy_comp.add('dtend', dtend)
        freebusy_ical.add_component(freebusy_comp)
        outbox = this.schedule_outbox()
        caldavobj = FreeBusy(data=freebusy_ical, parent=outbox)
        caldavobj.add_organizer()
        for attendee in attendees:
            caldavobj.add_attendee(attendee, no_default_parameters=true)

        response = this.client.post(outbox.url, caldavobj.data, headers={'Content-Type': 'text/calendar; charset=utf-8'})
        return response.find_objects_and_props()

    calendar_user_address_set():
        """
        defined in RFC6638
        """
        addresses = this.get_property(cdav.CalendarUserAddressSet(), parse_props=false)
        assert not [x for x in addresses if x.tag != dav.Href().tag]
        addresses = list(addresses)
        /// possibly the preferred attribute is iCloud-specific.
        /// TODO: do more research on that
        addresses.sort(key=lambda x: -int(x.get('preferred', 0)))
        return [x.text for x in addresses]

    schedule_inbox():
        return ScheduleInbox(principal=this)

    schedule_outbox():
        return ScheduleOutbox(principal=this)

