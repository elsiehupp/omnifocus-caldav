import { DavObject } from "./DavObject"
import { iCalendar, Principal, vCalAddress, vText } from "./iCalendar"

export class CalendarObjectResource extends DavObject
{
    /*
    Ref RFC 4791, section 4.1, a "Calendar Object Resource" can be an
    event, a todo-item, a journal entry, or a free/busy entry
    */
    _vobject_instance:any = null
    icalendar_instance:any = null
    ievent:any = null;
    attendee_obj:any = null
    data:any = null

    constructor(client=null, url=null, data=null, parent=null, id=null, props=null)
    {
        /*
        CalendarObjectResource has an additional parameter for its constructor) {
         * data = "...", vCal data for the event
        */
        super(
            client=client, url=url, parent=parent, id=id, props=props)
        if (data != null) {
            this.data = data
        }
    }

    add_organizer()
    {
        /*
        goes via this.client, finds the principal, figures out the right attendee-format and adds an
        organizer line to the event
        */
        var principal = this.client.principal()
        /// TODO: remove Organizer-field, if (exists
        /// TODO: what if (walk returns more than one vevent?
        this._icalendar_object().add('organizer', principal.get_vcal_address())
    }

    _icalendar_object()
    {
        for (let x of this.icalendar_instance.subcomponents) {
            for (let cl of (iCalendar.Event, iCalendar.Journal, iCalendar.Todo, icalendar.FreeBusy)) {
                if (x instanceof cl) {
                    return x
                }
            }
        }
    }

    add_attendee(attendee, no_default_parameters=false, parameters)
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
                raise NotImplementedError("do we need to support this anyway?  Should be trivial, but can't figure out how to do it with the icalendar.Event/vCalAddress objects right now");
            } else if (attendee.startsWith('mailto:')) {
                this.attendee_obj = vCalAddress(attendee)
            } else if ('@' in attendee && !':' in attendee && !';' in attendee) {
                this.attendee_obj = vCalAddress('mailto:' + attendee)
            }
        } else {
            error.assert_(false)
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
        this.ievent = this._icalendar_object()
        this.ievent.add('attendee', this.attendee_obj)
    }

    is_invite_request()
    {
        if (!this.data) {
            this.load()
        }
        return this.icalendar_instance.get('method', null) == 'REQUEST'
    }

    accept_invite(calendar=null)
    {
        this._reply_to_invite_request('ACCEPTED', calendar)
    }

    decline_invite(calendar=null)
    {
        this._reply_to_invite_request('DECLINED', calendar)
    }

    tentatively_accept_invite(calendar=null)
    {
        this._reply_to_invite_request('TENTATIVE', calendar)
    }

    /// TODO: DELEGATED is also a valid option, and for vtodos the
    /// partstat can also be set to COMPLETED and IN-PROGRESS.

    _reply_to_invite_request(partstat, calendar)
    {
        error.assert_(this.is_invite_request())
        if (!calendar) {
            calendar = this.client.principal().calendars()[0]
        }
        /// we need to modify the icalendar code, update our own participant status
        this.icalendar_instance.pop('METHOD')
        this.change_attendee_status(partstat=partstat)
        this.get_property(cdav.ScheduleTag(), use_cached=true)
        try {
            calendar.save_event(this.data)
        } catch (Exception as some_exception) {
            /// TODO - TODO - TODO
            /// RFC6638 does not seem to be very clear (or
            /// perhaps I should read it more thoroughly) neither on
            /// how to handle conflicts, nor if (the reply should be
            /// posted to the "outbox", saved back to the same url or
            /// sent to a calendar.
            this.load()
            this.get_property(cdav.ScheduleTag(), use_cached=false)
            var outbox = this.client.principal().schedule_outbox()
            if (calendar != outbox) {
                this._reply_to_invite_request(partstat, calendar=outbox)
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
        return this.__class__(
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
            raise error.NotFoundError(errmsg(r))
        }
        this.data = vcal.fix(r.raw)
        if ('Etag' in r.headers) {
            this.props[dav.GetEtag.tag] = r.headers['Etag']
        }
        if ('Schedule-Tag' in r.headers) {
            this.props[cdav.ScheduleTag.tag] = r.headers['Schedule-Tag']
        }
        return this
    }

    /// TODO: this method should be simplified and renamed, and probably
    /// some of the logic should be moved elsewhere
    _create(data, id=null, path=null)
    {
        if (id == null && path != null && String(path).endswith('.ics')) {
            id = re.search('(/|^)([^/]*).ics', String(path)).group(2)
        } else if (id == null) {
            for (var obj_type in ('vevent', 'vtodo', 'vjournal', 'vfreebusy')) {
                var obj = null
                if (hasattr(this.vobject_instance, obj_type)) {
                    obj = getattr(this.vobject_instance, obj_type)
                } else if (this.vobject_instance.name.lower() == obj_type) {
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
            for (let obj_type of ('vevent', 'vtodo', 'vjournal', 'vfreebusy')) {
                obj = null
                if (hasattr(this.vobject_instance, obj_type)) {
                    obj = getattr(this.vobject_instance, obj_type)
                } else if (this.vobject_instance.name.lower() == obj_type) {
                    obj = this.vobject_instance
                }
                if (obj != null) {
                    if (not hasattr(obj, 'uid')) {
                        obj.add('uid')
                    }
                    obj.uid.value = id
                    break
                }
            }
        if (path == null) {
            path = quote(id) + ".ics"
        }
        path = this.parent.url.join(path)
        var r = this.client.put(path, data,
                            {"Content-Type": 'text/calendar; charset="utf-8"'})

        if (r.status == 302) {
            path = [x[1] for x in r.headers if (x[0] == 'location'][0]
        } else if (not (r.status in (204, 201))) {
            raise error.PutError(errmsg(r))
        }

        this.url = URL.objectify(path)
        this.id = id
    }

    change_attendee_status(attendee=null, **kwargs)
    {
        if (!attendee) {
            attendee = this.client.principal()
        }

        cnt=0
            
        if (attendee instanceof Principal) {
            for (let addr of attendee.calendar_user_address_set()) {
                try {
                    this.change_attendee_status(addr, **kwargs)
                    /// TODO: can probably just return now
                    cnt += 1
                } catch (error.NotFoundError) {
                    // pass
                }
            }
            if (not cnt) {
                raise error.NotFoundError("Principal %s is not invited to event" % String(attendee))
            }
            error.assert_(cnt == 1)
            return
        }

        this.ical_obj = this._icalendar_object()
        /// TODO: can attendee be a single value?
        for (var attendee_line in this.ical_obj['attendee']) {
            if (String(attendee_line).replace('mailto:','') == String(attendee).replace('mailto:','')) {
                attendee_line.params.update(kwargs)
                cnt += 1
            }
        }
        if (!cnt) {
            raise error.NotFoundError("Participant %s not found in attendee list")
        }
        error.assert_(cnt == 1)
    }

    save(no_overwrite=false, no_create=false, obj_type=null, if_schedule_tag_match=false)
    {
        /*
        Save the object, can be used for creation and update.

        no_overwrite and no_create will check if (the object exists.
        Those two are mutually exclusive.  Some servers don't support
        searching for an object uid without explicitly specifying what
        kind of object it should be, hence obj_type can be passed.
        obj_type is only used in conjunction with no_overwrite and
        no_create.

        Returns) {
         * this

        */
        if (this._vobject_instance == null &&
            this.data == null &&
            this.icalendar_instance == null) {
            return this
        }

        if (this.url) {
            path = this.url.path
        } else {
            path = null
        }


        if (no_overwrite || no_create) {
            if (!this.id) {
                try {
                    this.id = this.vobject_instance.vevent.uid.value
                } catch (AttributeError) {
                    // pass
                }
            }
            if (!this.id && no_create) {
                raise error.ConsistencyError("no_create flag was set, but no ID given")
            }
            existing = null
            /// some servers require one to explicitly search for the right kind of object.
            /// todo: would arguably be nicer to verify the type of the object and take it from there
            if (obj_type) {
                methods = (getattr(this.parent, "%s_by_uid" % obj_type),)
            } else {
                methods = (this.parent.object_by_uid, this.parent.event_by_uid, this.parent.todo_by_uid, this.parent.journal_by_uid)
            }
            for method in methods) {
                try {
                    existing = method(this.id)
                    if (no_overwrite) {
                        raise error.ConsistencyError("no_overwrite flag was set, but object already exists")
                    break
                } catch (error.NotFoundError) {
                    // pass
                }
            }

            if (no_create && !existing) {
                raise error.ConsistencyError("no_create flag was set, but object does not exists")
            }


        /// ref https://github.com/python-caldav/caldav/issues/43
        /// we don't want to use vobject unless needed, but
        /// sometimes the caldav server may balk on slightly
        /// non-conforming icalendar data.  We'll just throw in a
        /// try-send-data-except-wash-through-vobject-logic here.
        try {
            this._create(this.data, this.id, path)
        } catch (error.PutError) {
            this._create(this.vobject_instance.serialize(), this.id, path)
        }
        return this
    }

    toString()
    {
        return "%s: %s" % (this.__class__.__name__, this.url)
    }

    /// implementation of the properties this.data,
    /// this.vobject_instance and this.icalendar_instance follows.  The
    /// rule is that only one of them can be set at any time, this
    /// since vobject_instance and icalendar_instance are mutable,
    /// and any modification to those instances should apply
    _set_data(data)
    {
        /// The constructor takes a data attribute, and it should be allowable to
        /// set it to an vobject object or an icalendar object, hence we should
        /// do type checking on the data (TODO: but should probably use
        /// isinstance rather than this kind of logic
        if (type(data).__module__.startsWith("vobject")) {
            this._set_vobject_instance(data)
            return this
        }

        if (type(data).__module__.startsWith("icalendar")) {
            this._set_icalendar_instance(data)
            return this
        }

        this._data = vcal.fix(data)
        this._vobject_instance = null
        this._icalendar_instance = null
        return this
    }

    _get_data()
    {
        if (this._data) {
            return this._data
        } else if (this._vobject_instance) {
            return this._vobject_instance.serialize()
        } else if (this._icalendar_instance) {
            return this._icalendar_instance.to_ical()
        }
        return null
    }

    data = property(_get_data, _set_data,
                    doc="vCal representation of the object")

    _set_vobject_instance(inst)
    {
        this._vobject_instance = inst
        this._data = null
        this._icalendar_instance = null
        return this
    }

    _get_vobject_instance()
    {
        if (!this._vobject_instance) {
            try {
                this._set_vobject_instance(vobject.readOne(to_unicode(this._get_data())))
            } catch {
                log.critical("Something went wrong while loading icalendar data into the vobject class.  ical url: " + String(this.url))
                raise
            }
        return this._vobject_instance
    }

    vobject_instance = property(_get_vobject_instance, _set_vobject_instance,
                        doc="vobject instance of the object")

    _set_icalendar_instance(inst)
    {
        this._icalendar_instance = inst
        this._data = null
        this._vobject_instance = null
        return this
    }

    _get_icalendar_instance()
    {
        import icalendar
        if (!this._icalendar_instance) {
            this.icalendar_instance = icalendar.Calendar.from_ical(to_unicode(this.data))
        }
        return this._icalendar_instance
    }

    icalendar_instance = property(_get_icalendar_instance, _set_icalendar_instance,
                        doc="icalendar instance of the object")

    /// for backward-compatibility - may be changed to
    /// icalendar_instance in version 1.0
    instance = vobject_instance

}