import { CalendarSet } from "./CalendarSet"
import { CalendarUserAddressSet } from "./CalendarUserAddressSet"
import { DavObject } from "./DavObject"
import { CalendarHomeSet } from "./CalendarHomeSet"
import { Href } from "./Href"
import { ScheduleInbox } from "./ScheduleInbox"
import { ScheduleOutbox } from "./ScheduleOutbox"

export class Principal extends DavObject
{
    /*
    This class represents a DAV Principal. It doesn't do much, except
    keep track of the URLs for the calendar-home-set, etc.

    A principal MUST have a non-empty DAV:displayname property
    (defined in Section 13.2 of [RFC2518]),
    and a DAV:resourcetype property (defined in Section 13.9 of [RFC2518]).
    Additionally, a principal MUST report the DAV:principal XML element
    in the value of the DAV:resourcetype property.

    (TODO: the resourcetype is actually never checked, and the DisplayName 
    is not stored anywhere)
    */
    url:any;
    _calendar_home_set:CalendarHomeSet;
    cup:any;
    client:any;
    dav:any;
    cdav:any;

    constructor(client=null, url=null)
    {
        /*
        Returns a Principal.

        Parameters) {
         * client: a DavClient() oject
         * url: Deprecated - for backwards compatibility purposes only.

        if (url is not given, deduct principal path as well as calendar home set
        path from doing propfinds.
        */
        super(client, url, null, null, null, null, null)
        this._calendar_home_set = null

        if (url == null) {
            this.url = this.client.url
            this.cup = this.get_property(CurrentUserPrincipal())
            this.url = this.client.url.join(
                URL.objectify(this.cup))
        }
    }

    make_calendar(name=null, cal_id=null, supported_calendar_component_set=null)
    {
        /*
        Convenience method, bypasses the this.calendar_home_set object.
        See CalendarSet.make_calendar for details.
        */
        return this._calendar_home_set.make_calendar(
            name, cal_id,
            supported_calendar_component_set=supported_calendar_component_set)
    }

    calendar(name=null, cal_id=null)
    {
        /*
        The calendar method will return a calendar object.
        It will not initiate any communication with the server.
        */
        return this._calendar_home_set.calendar(name, cal_id)
    }

    get_vcal_address()
    {
        /*
        Returns the principal, as an icalendar.vCalAddress object
        */
        /// Late import.  Prior to 1.0, icalendar is only an optional dependency.
        import { vCalAddress, vText } from "./icalendar";
        var cn = this.get_property(this.dav.DisplayName())
        var ids = this.calendar_user_address_set()
        var cutype = this.get_property(this.cdav.CalendarUserType())
        var ret = vCalAddress(ids[0])
        ret.params['cn'] = vText(cn)
        ret.params['cutype'] = vText(cutype)
        return ret
    }

    // @property
    calendar_home_set()
    {
        if (!this._calendar_home_set) {
            this._calendar_home_set = this.get_property(this.cdav.CalendarHomeSet())
        }
        return this._calendar_home_set
    }

    // @calendar_home_set.setter
    calendar_home_set_from_url(url)
    {
        if (url instanceof CalendarSet) {
            this._calendar_home_set = url
            return
        }
        var sanitized_url = URL.objectify(url)
        /// TODO: sanitized_url should never be null, this needs more
        /// research.  added here as it solves real-world issues, ref
        /// https://github.com/python-caldav/caldav/pull/56
        if (sanitized_url != null) {
            if (sanitized_url.hostname &&
                sanitized_url.hostname != this.client.url.hostname) {
                // icloud (and others?) having a load balanced system,
                // where each principal resides on one named host
                /// TODO) {
                /// Here be dragons.  sanitized_url will be the root
                /// of all future objects derived from client.  Changing
                /// the client.url root by doing a principal.calendars()
                /// is an unacceptable side effect and may be a cause of
                /// incompatibilities with icloud.  Do more research!
                this.client.url = sanitized_url
            }
        }
        this._calendar_home_set = new CalendarSet(this.client, this.client.url.join(sanitized_url))
    }

    calendars()
    {
        /*
        Return the principials calendars
        */
        return this.calendar_home_set.calendars()
    }

    freebusy_request(dtstart, dtend, attendees)
    {
        import { icalendar } from "./icalendar";
        var freebusy_ical = icalendar.Calendar()
        freebusy_ical.add('prodid', '-//tobixen/python-caldav//EN')
        freebusy_ical.add('version', '2.0')
        freebusy_ical.add('method', 'REQUEST')
        var uid = uuid.uuid1()
        var freebusy_comp = icalendar.FreeBusy()
        freebusy_comp.add('uid', uid)
        freebusy_comp.add('dtstamp', datetime.now())
        freebusy_comp.add('dtstart', dtstart)
        freebusy_comp.add('dtend', dtend)
        freebusy_ical.add_component(freebusy_comp)
        var outbox = this.schedule_outbox()
        var caldavobj = FreeBusy(data=freebusy_ical, parent=outbox)
        caldavobj.add_organizer()
        for (let attendee of attendees) {
            caldavobj.add_attendee(attendee, true)
        }

        var response = this.client.post(outbox.url, caldavobj.data, headers={'Content-Type': 'text/calendar; charset=utf-8'})
        return response.find_objects_and_props()
    }

    calendar_user_address_set()
    {
        /*
        defined in RFC6638
        */
        var addresses = this.get_property(CalendarUserAddressSet(), parse_props=false)
        for (let x of addresses) {
            if (x.tag != Href.tag) {
                assert (!x)
            }
        }
        addresses = new List(addresses)
        /// possibly the preferred attribute is iCloud-specific.
        /// TODO: do more research on that
        addresses.sort(key=lambda x: -int(x.get('preferred', 0)))
        var ret = new List();
        for (let x of addresses) {
            ret.add(x.text)
        }
        return ret
    }

    schedule_inbox()
    {
        return new ScheduleInbox(this)
    }

    schedule_outbox()
    {
        return new ScheduleOutbox(this)
    }
}