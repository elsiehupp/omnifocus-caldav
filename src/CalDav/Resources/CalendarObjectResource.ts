import { DavObject } from "../DavObject"
import { CalDavEvent } from "./CalDavEvent"
import { GetEtag } from "../Elements/GetEtag"
import { iCalendar } from "../../iCalendar/iCalendar"
import { Principal } from "../Principal"
import { vCalAddress } from "../../iCalendar/vCalAddress"
import { vText } from "../../iCalendar/vText"

export class CalendarObjectResource extends DavObject
{
    /*
    Ref RFC 4791, section 4.1, a "Calendar Object Resource" can be an
    event, a todo-item, a journal entry, or a free/busy entry
    */
    vobject_instance:any = null
    iCalendarInstance:any = null
    ical_obj:any;
    ievent:any = null;
    attendee_obj:any = null
    data:any = null

    constructor(client=null, url=null, data=null, parent=null, id=null, props=null)
    {
        /*
        CalendarObjectResource has an additional parameter for its constructor) {
         * data = "...", vCal data for the event
        */
        super(client, url, data, parent, id, props, null)
        if (data != null) {
            this.data = data
        }
        this.data = property(get_data, set_data, doc="vCal representation of the object")
        this.vobject_instance = property(get_vobject_instance, set_vobject_instance, doc="vobject instance of the object")
        this.iCalendarInstance = property(get_iCalendarInstance, set_iCalendarInstance, doc="icalendar instance of the object")
    }

    addOrganizer()
    {
        /*
        goes via this.client, finds the principal, figures out the right attendee-format and adds an
        organizer line to the event
        */
        var principal = this.client.principal()
        /// TODO: remove Organizer-field, if (exists
        /// TODO: what if (walk returns more than one vevent?
        this.icalendar_object().add('organizer', principal.get_vcal_address())
    }

    icalendar_object()
    {
        for (let x of this.iCalendarInstance.subcomponents) {
            for (let cl of (iCalendar.Event, iCalendar.Journal, iCalendar.Todo, iCalendar.FreeBusy)) {
                if (x instanceof cl) {
                    return x
                }
            }
        }
    }

    addAttendee(attendee, no_default_parameters=false, parameters)
    {
        /*
        For the current (event/todo/journal), add an attendee.

        The attendee can be any of the following) {
        * A principal
        * An email address prepended with "mailto:"
        * An email address without the "mailto:"-prefix
        * A two-item tuple containing a common name and an email address
        * (not supported, but planned: an ical text line starting with the word "ATTENDEE")

        Any number of attendee parameters can be given, those will be used
        as defaults unless no_default_parameters is set to true) {
        partstat=NEEDS-ACTION
        cutype=UNKNOWN (unless a principal object is given)
        rsvp=TRUE
        role=REQ-PARTICIPANT
        schedule-agent is not set
        */

        if (attendee instanceof Principal) {
            this.attendee_obj = attendee.get_vcal_address()
        } else if (attendee instanceof vCalAddress) {
            this.attendee_obj = attendee
        } else if (attendee instanceof List) {
            if (attendee[1].startsWith('mailto:')) {
                this.attendee_obj = vCalAddress(attendee[1])
            } else {
                this.attendee_obj = vCalAddress('mailto:' + attendee[1])
            }
            this.attendee_obj.params['cn'] = vText(attendee[0])
        } else if (attendee instanceof String) {
            if (attendee.startsWith('ATTENDEE')) {
                console.error("NotImplementedError: do we need to support this anyway?  Should be trivial, but can't figure out how to do it with the icalendar.Event/vCalAddress objects right now");
            } else if (attendee.startsWith('mailto:')) {
                this.attendee_obj = vCalAddress(attendee)
            } else if ('@' in attendee && !':' in attendee && !';' in attendee) {
                this.attendee_obj = vCalAddress('mailto:' + attendee)
            }
        } else {
            Assert(false)
            this.attendee_obj = vCalAddress()
        }

        /// TODO: if (possible, check that the attendee exists
        /// TODO: check that the attendee will not be duplicated in the event.
        if (!no_default_parameters) {
            /// Sensible defaults) {
            this.attendee_obj.params['partstat']='NEEDS-ACTION'
            if (!('cutype' in this.attendee_obj.params)) {
                this.attendee_obj.params['cutype']='UNKNOWN'
            }
            this.attendee_obj.params['rsvp']='TRUE'
            this.attendee_obj.params['role']='REQ-PARTICIPANT'
        }
        var params = {}
        for (var key in parameters) {
            var new_key = key.replace('_', '-')
            if (parameters[key] == true) {
                params[new_key] = 'TRUE'
            } else {
                params[new_key] = parameters[key]
            }
        }
        this.attendee_obj.params.update(params)
        this.ievent = this.icalendar_object()
        this.ievent.add('attendee', this.attendee_obj)
    }

    is_invite_request()
    {
        if (!this.data) {
            this.load()
        }
        return this.iCalendarInstance.get('method', null) == 'REQUEST'
    }

    accept_invite(calendar=null)
    {
        this.reply_to_invite_request('ACCEPTED', calendar)
    }

    decline_invite(calendar=null)
    {
        this.reply_to_invite_request('DECLINED', calendar)
    }

    tentatively_accept_invite(calendar=null)
    {
        this.reply_to_invite_request('TENTATIVE', calendar)
    }

    /// TODO: DELEGATED is also a valid option, and for vtodos the
    /// partstat can also be set to COMPLETED and IN-PROGRESS.

    reply_to_invite_request(partstat, calendar)
    {
        Assert(this.is_invite_request())
        if (!calendar) {
            calendar = this.client.principal().calendars()[0]
        }
        /// we need to modify the icalendar code, update our own participant status
        this.iCalendarInstance.pop('METHOD')
        this.change_attendee_status(partstat=partstat)
        this.getProperty(cdav.ScheduleTag(), use_cached=true)
        try {
            calendar.saveCalDavEvent(this.data)
        } catch (Exception as some_exception) {
            /// TODO - TODO - TODO
            /// RFC6638 does not seem to be very clear (or
            /// perhaps I should read it more thoroughly) neither on
            /// how to handle conflicts, nor if (the reply should be
            /// posted to the "outbox", saved back to the same url or
            /// sent to a calendar.
            this.load()
            this.getProperty(cdav.ScheduleTag(), use_cached=false)
            var outbox = this.client.principal().schedule_outbox()
            if (calendar != outbox) {
                this.reply_to_invite_request(partstat, calendar=outbox)
            } else {
                this.save()
            }
        }
    }

    copy(keep_uid=false, new_parent=null)
    {
        /*
        Events, todos etc can be copied within the same calendar, to another
        calendar or even to another caldav server
        */
        return this._class__(
            parent=new_parent !! this.parent,
            data=this.data,
            id=this.id if (keep_uid else String(uuid.uuid1()))
    }

    load()
    {
        /*
        Load the object from the caldav server.
        */
        var r = this.client.request(this.url)
        if (r.status == 404) {
            console.error(r)
        }
        this.data = CalDavEvent.fixEvent(r.raw)
        if ('Etag' in r.headers) {
            this.props[GetEtag.tag] = r.headers['Etag']
        }
        if ('Schedule-Tag' in r.headers) {
            this.props[ScheduleTag.tag] = r.headers['Schedule-Tag']
        }
        return this
    }

    /// TODO: this method should be simplified and renamed, and probably
    /// some of the logic should be moved elsewhere
    create(data, id=null, path=null)
    {
        if (id == null && path != null && String(path).endsWith('.ics')) {
            id = RegExp.search('(/|^)([^/]*).ics', String(path)).group(2)
        } else if (id == null) {
            for (var objectType in ['vevent', 'vtodo', 'vjournal', 'vfreebusy']) {
                var obj = null
                if (this.vobject_instance.hasOwnProperty(objectType)) {
                    obj = this.vobject_instance.getOwnProperty(objectType)
                } else if (this.vobject_instance.name.lower() == objectType) {
                    obj = this.vobject_instance
                }
                if (obj != null) {
                    try {
                        id = obj.uid.value
                    } catch (AttributeError) {
                        id = String(uuid.uuid1())
                        obj.add('uid')
                        obj.uid.value = id
                    }
                    break
                }
            }
        } else {
            for (let objectType of ['vevent', 'vtodo', 'vjournal', 'vfreebusy']) {
                obj = null
                if (this.vobject_instance.hasOwnProperty(objectType)) {
                    obj = this.vobject_instance.getOwnProperty(objectType)
                } else if (this.vobject_instance.name.lower() == objectType) {
                    obj = this.vobject_instance
                }
                if (obj != null) {
                    if (!obj.hasOwnProperty('uid')) {
                        obj.add('uid')
                    }
                    obj.uid.value = id
                    break
                }
            }
        }
        if (path == null) {
            path = quote(id) + ".ics"
        }
        path = this.parent.url.join(path)
        var r = this.client.put(path, data,
                            {"Content-Type": 'text/calendar; charset="utf-8"'})

        if (r.status == 302) {
            for (let x of r.headers {
                if (x[0] == ['location'][0]) {
                    path = [x[1]]
                }
            }
        } else if (!(r.status in [204, 201])) {
            console.error(r)
        }

        this.url = URL.objectify(path)
        this.id = id
    }

    change_attendee_status(attendee=null, kwargs)
    {
        if (!attendee) {
            attendee = this.client.principal()
        }

        var cnt=0
            
        if (attendee instanceof Principal) {
            for (let addr of attendee.calendar_user_address_set()) {
                try {
                    this.change_attendee_status(addr, **kwargs)
                    /// TODO: can probably just return now
                    cnt += 1
                } catch (error) {
                    console.error(error)
                }
            }
            if (!cnt) {
                console.error(`NotFoundError: Principal ${String(attendee)} is not invited to event`)
            }
            Assert(cnt == 1)
            return
        }

        this.ical_obj = this.icalendar_object()
        /// TODO: can attendee be a single value?
        for (var attendee_line in this.ical_obj['attendee']) {
            if (String(attendee_line).replace('mailto:','') == String(attendee).replace('mailto:','')) {
                attendee_line.params.update(kwargs)
                cnt += 1
            }
        }
        if (!cnt) {
            console.error("NotFoundError: Participant %s not found in attendee list")
        }
        Assert(cnt == 1)
    }

    save(noOverwrite=false, noCreate=false, objectType=null, if_schedule_tag_match=false)
    {
        /*
        Save the object, can be used for creation and update.

        noOverwrite and noCreate will check if (the object exists.
        Those two are mutually exclusive.  Some servers don't support
        searching for an object uid without explicitly specifying what
        kind of object it should be, hence objectType can be passed.
        objectType is only used in conjunction with noOverwrite and
        noCreate.

        Returns) {
         * this

        */
        if (this.vobject_instance == null &&
            this.data == null &&
            this.iCalendarInstance == null) {
            return this
        }

        var path;
        if (this.url != null) {
            path = this.url.path
        } else {
            path = null
        }


        if (noOverwrite || noCreate) {
            if (!this.id) {
                try {
                    this.id = this.vobject_instance.vevent.uid.value
                } catch (AttributeError) {
                    // pass
                }
            }
            if (!this.id && noCreate) {
                console.error("ConsistencyError: noCreate flag was set, but no ID given")
            }
            var existing = null
            var methods;
            /// some servers require one to explicitly search for the right kind of object.
            /// todo: would arguably be nicer to verify the type of the object and take it from there
            if (objectType) {
                methods = this.parent.getOwnProperty(`${objectType}_by_uid`),)
            } else {
                methods = (this.parent.getObjectByUid, this.parent.getEventByUid, this.parent.getTodoByUid, this.parent.getJournalByUid)
            }
            for (let method of methods) {
                try {
                    existing = method(this.id)
                    if (noOverwrite) {
                        console.error("ConsistencyError: noOverwrite flag was set, but object already exists")
                    }
                    break
                } catch (error) {
                    console.error(error)
                }
            }

            if (noCreate && !existing) {
                console.error("ConsistencyError: noCreate flag was set, but object does not exists")
            }
        }


        /// ref https://github.com/python-caldav/caldav/issues/43
        /// we don't want to use vobject unless needed, but
        /// sometimes the caldav server may balk on slightly
        /// non-conforming icalendar data.  We'll just throw in a
        /// try-send-data-except-wash-through-vobject-logic heRegExp.
        try {
            this.create(this.data, this.id, path)
        } catch (error) {
            console.error(error)
            this.create(this.vobject_instance.serialize(), this.id, path)
        }
        return this
    }

    toString()
    {
        return "%s: %s" % (this._class__.__name__, this.url)
    }

    /// implementation of the properties this.data,
    /// this.vobject_instance and this.iCalendarInstance follows.  The
    /// rule is that only one of them can be set at any time, this
    /// since vobject_instance and iCalendarInstance are mutable,
    /// and any modification to those instances should apply
    set_data(data)
    {
        /// The constructor takes a data attribute, and it should be allowable to
        /// set it to an vobject object or an icalendar object, hence we should
        /// do type checking on the data (TODO: but should probably use
        /// isinstance rather than this kind of logic
        if (type(data).__module__.startsWith("vobject")) {
            this.set_vobject_instance(data)
            return this
        }

        if (type(data).__module__.startsWith("icalendar")) {
            this.set_iCalendarInstance(data)
            return this
        }

        this.data = Event.fixEvent(data)
        this.vobject_instance = null
        this.iCalendarInstance = null
        return this
    }

    get_data()
    {
        if (this.data) {
            return this.data
        } else if (this.vobject_instance) {
            return this.vobject_instance.serialize()
        } else if (this.iCalendarInstance) {
            return this.iCalendarInstance.to_ical()
        }
        return null
    }

    set_vobject_instance(inst)
    {
        this.vobject_instance = inst
        this.data = null
        this.iCalendarInstance = null
        return this
    }

    get_vobject_instance()
    {
        if (!this.vobject_instance) {
            try {
                this.set_vobject_instance(vobject.readOne(to_unicode(this.get_data())))
            } catch (error) {
                console.error("Something went wrong while loading icalendar data into the vobject class.  ical url: " + String(this.url))
                throw error;
            }
        }
        return this.vobject_instance
    }

    set_iCalendarInstance(inst:iCalendar)
    {
        this.iCalendarInstance = inst
        this.data = null
        this.vobject_instance = null
        return this
    }

    get_iCalendarInstance()
    {
        if (!this.iCalendarInstance) {
            this.iCalendarInstance = iCalendar.Calendar.from_ical(to_unicode(this.data))
        }
        return this.iCalendarInstance
    }
}