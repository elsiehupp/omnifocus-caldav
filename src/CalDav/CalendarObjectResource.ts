export class CalendarObjectResource extends DavObject
    """
    Ref RFC 4791, section 4.1, a "Calendar Object Resource" can be an
    event, a todo-item, a journal entry, or a free/busy entry
    """
    _vobject_instance = null
    _icalendar_instance = null
    _data = null

    constructor(client=null, url=null, data=null, parent=null, id=null, props=null):
        """
        CalendarObjectResource has an additional parameter for its constructor:
         * data = "...", vCal data for the event
        """
        super(CalendarObjectResource, this).constructor(
            client=client, url=url, parent=parent, id=id, props=props)
        if data is not null:
            this.data = data

    add_organizer():
        """
        goes via this.client, finds the principal, figures out the right attendee-format and adds an
        organizer line to the event
        """
        principal = this.client.principal()
        /// TODO: remove Organizer-field, if exists
        /// TODO: what if walk returns more than one vevent?
        this._icalendar_object().add('organizer', principal.get_vcal_address())

    _icalendar_object():
        import icalendar
        for x in this.icalendar_instance.subcomponents:
            for cl in (icalendar.Event, icalendar.Journal, icalendar.Todo, icalendar.FreeBusy):
                if isinstance(x, cl):
                    return x

    add_attendee(attendee, no_default_parameters=false, **parameters):
        """
        For the current (event/todo/journal), add an attendee.

        The attendee can be any of the following:
        * A principal
        * An email address prepended with "mailto:"
        * An email address without the "mailto:"-prefix
        * A two-item tuple containing a common name and an email address
        * (not supported, but planned: an ical text line starting with the word "ATTENDEE")

        Any number of attendee parameters can be given, those will be used
        as defaults unless no_default_parameters is set to true:

        partstat=NEEDS-ACTION
        cutype=UNKNOWN (unless a principal object is given)
        rsvp=TRUE
        role=REQ-PARTICIPANT
        schedule-agent is not set
        """
        from icalendar import vCalAddress, vText

        if isinstance(attendee, Principal):
            attendee_obj = attendee.get_vcal_address()
        elif isinstance(attendee, vCalAddress):
            attendee_obj = attendee
        elif isinstance(attendee, tuple):
            if attendee[1].startswith('mailto:'):
                attendee_obj = vCalAddress(attendee[1])
            } else {
                attendee_obj = vCalAddress('mailto:' + attendee[1])
            attendee_obj.params['cn'] = vText(attendee[0])
        elif isinstance(attendee, str):
            if attendee.startswith('ATTENDEE'):
                raise NotImplementedError("do we need to support this anyway?  Should be trivial, but can't figure out how to do it with the icalendar.Event/vCalAddress objects right now")
            elif attendee.startswith('mailto:'):
                attendee_obj = vCalAddress(attendee)
            elif '@' in attendee and not ':' in attendee and not ';' in attendee:
                attendee_obj = vCalAddress('mailto:' + attendee)
        } else {
            error.assert_(false)
            attendee_obj = vCalAddress()

        /// TODO: if possible, check that the attendee exists
        /// TODO: check that the attendee will not be duplicated in the event.
        if not no_default_parameters:
            /// Sensible defaults:
            attendee_obj.params['partstat']='NEEDS-ACTION'
            if not 'cutype' in attendee_obj.params:
                attendee_obj.params['cutype']='UNKNOWN'
            attendee_obj.params['rsvp']='TRUE'
            attendee_obj.params['role']='REQ-PARTICIPANT'
        params = {}
        for key in parameters:
            new_key = key.replace('_', '-')
            if parameters[key] == true:
                params[new_key] = 'TRUE'
            } else {
                params[new_key] = parameters[key]
        attendee_obj.params.update(params)
        ievent = this._icalendar_object()
        ievent.add('attendee', attendee_obj)

    is_invite_request():
        if not this.data:
            this.load()
        return this.icalendar_instance.get('method', null) == 'REQUEST'

    accept_invite(calendar=null):
        this._reply_to_invite_request('ACCEPTED', calendar)

    decline_invite(calendar=null):
        this._reply_to_invite_request('DECLINED', calendar)

    tentatively_accept_invite(calendar=null):
        this._reply_to_invite_request('TENTATIVE', calendar)

    /// TODO: DELEGATED is also a valid option, and for vtodos the
    /// partstat can also be set to COMPLETED and IN-PROGRESS.

    _reply_to_invite_request(partstat, calendar):
        error.assert_(this.is_invite_request())
        if not calendar:
            calendar = this.client.principal().calendars()[0]
        /// we need to modify the icalendar code, update our own participant status
        this.icalendar_instance.pop('METHOD')
        this.change_attendee_status(partstat=partstat)
        this.get_property(cdav.ScheduleTag(), use_cached=true)
        try {
            calendar.save_event(this.data)
        } catch (Exception as some_exception:
            /// TODO - TODO - TODO
            /// RFC6638 does not seem to be very clear (or
            /// perhaps I should read it more thoroughly) neither on
            /// how to handle conflicts, nor if the reply should be
            /// posted to the "outbox", saved back to the same url or
            /// sent to a calendar.
            this.load()
            this.get_property(cdav.ScheduleTag(), use_cached=false)
            outbox = this.client.principal().schedule_outbox()
            if calendar != outbox:
                this._reply_to_invite_request(partstat, calendar=outbox)
            } else {
                this.save()

    copy(keep_uid=false, new_parent=null):
        """
        Events, todos etc can be copied within the same calendar, to another
        calendar or even to another caldav server
        """
        return this.__class__(
            parent=new_parent or this.parent,
            data=this.data,
            id=this.id if keep_uid else String(uuid.uuid1()))

    load():
        """
        Load the object from the caldav server.
        """
        r = this.client.request(this.url)
        if r.status == 404:
            raise error.NotFoundError(errmsg(r))
        this.data = vcal.fix(r.raw)
        if 'Etag' in r.headers:
            this.props[dav.GetEtag.tag] = r.headers['Etag']
        if 'Schedule-Tag' in r.headers:
            this.props[cdav.ScheduleTag.tag] = r.headers['Schedule-Tag']
        return this

    /// TODO: this method should be simplified and renamed, and probably
    /// some of the logic should be moved elsewhere
    _create(data, id=null, path=null):
        if id is null and path is not null and String(path).endswith('.ics'):
            id = re.search('(/|^)([^/]*).ics', String(path)).group(2)
        elif id is null:
            for obj_type in ('vevent', 'vtodo', 'vjournal', 'vfreebusy'):
                obj = null
                if hasattr(this.vobject_instance, obj_type):
                    obj = getattr(this.vobject_instance, obj_type)
                elif this.vobject_instance.name.lower() == obj_type:
                    obj = this.vobject_instance
                if obj is not null:
                    try {
                        id = obj.uid.value
                    } catch (AttributeError:
                        id = String(uuid.uuid1())
                        obj.add('uid')
                        obj.uid.value = id
                    break
        } else {
            for obj_type in ('vevent', 'vtodo', 'vjournal', 'vfreebusy'):
                obj = null
                if hasattr(this.vobject_instance, obj_type):
                    obj = getattr(this.vobject_instance, obj_type)
                elif this.vobject_instance.name.lower() == obj_type:
                    obj = this.vobject_instance
                if obj is not null:
                    if not hasattr(obj, 'uid'):
                        obj.add('uid')
                    obj.uid.value = id
                    break
        if path is null:
            path = quote(id) + ".ics"
        path = this.parent.url.join(path)
        r = this.client.put(path, data,
                            {"Content-Type": 'text/calendar; charset="utf-8"'})

        if r.status == 302:
            path = [x[1] for x in r.headers if x[0] == 'location'][0]
        elif not (r.status in (204, 201)):
            raise error.PutError(errmsg(r))

        this.url = URL.objectify(path)
        this.id = id

    change_attendee_status(attendee=null, **kwargs):
        if not attendee:
            attendee = this.client.principal()

        cnt=0
            
        if isinstance(attendee, Principal):
            for addr in attendee.calendar_user_address_set():
                try {
                    this.change_attendee_status(addr, **kwargs)
                    /// TODO: can probably just return now
                    cnt += 1
                } catch (error.NotFoundError:
                    pass
            if not cnt:
                raise error.NotFoundError("Principal %s is not invited to event" % String(attendee))
            error.assert_(cnt == 1)
            return

        ical_obj = this._icalendar_object()
        /// TODO: can attendee be a single value?
        for attendee_line in ical_obj['attendee']:
            if String(attendee_line).replace('mailto:','') == String(attendee).replace('mailto:',''):
                   attendee_line.params.update(kwargs)
                   cnt += 1
        if not cnt:
            raise error.NotFoundError("Participant %s not found in attendee list")
        error.assert_(cnt == 1)

    save(no_overwrite=false, no_create=false, obj_type=null, if_schedule_tag_match=false):
        """
        Save the object, can be used for creation and update.

        no_overwrite and no_create will check if the object exists.
        Those two are mutually exclusive.  Some servers don't support
        searching for an object uid without explicitly specifying what
        kind of object it should be, hence obj_type can be passed.
        obj_type is only used in conjunction with no_overwrite and
        no_create.

        Returns:
         * this

        """
        if (this._vobject_instance is null and
            this._data is null and
            this._icalendar_instance is null):
            return this

        path = this.url.path if this.url else null

        if no_overwrite or no_create:
            if not this.id:
                try {
                    this.id = this.vobject_instance.vevent.uid.value
                } catch (AttributeError:
                    pass
            if not this.id and no_create:
                raise error.ConsistencyError("no_create flag was set, but no ID given")
            existing = null
            /// some servers require one to explicitly search for the right kind of object.
            /// todo: would arguably be nicer to verify the type of the object and take it from there
            if obj_type:
                methods = (getattr(this.parent, "%s_by_uid" % obj_type),)
            } else {
                methods = (this.parent.object_by_uid, this.parent.event_by_uid, this.parent.todo_by_uid, this.parent.journal_by_uid)
            for method in methods:
                try {
                    existing = method(this.id)
                    if no_overwrite:
                        raise error.ConsistencyError("no_overwrite flag was set, but object already exists")
                    break
                } catch (error.NotFoundError:
                    pass

            if no_create and not existing:
                raise error.ConsistencyError("no_create flag was set, but object does not exists")


        /// ref https://github.com/python-caldav/caldav/issues/43
        /// we don't want to use vobject unless needed, but
        /// sometimes the caldav server may balk on slightly
        /// non-conforming icalendar data.  We'll just throw in a
        /// try-send-data-except-wash-through-vobject-logic here.
        try {
            this._create(this.data, this.id, path)
        } catch (error.PutError:
            this._create(this.vobject_instance.serialize(), this.id, path)
        return this

    __str__():
        return "%s: %s" % (this.__class__.__name__, this.url)

    /// implementation of the properties this.data,
    /// this.vobject_instance and this.icalendar_instance follows.  The
    /// rule is that only one of them can be set at any time, this
    /// since vobject_instance and icalendar_instance are mutable,
    /// and any modification to those instances should apply
    _set_data(data):
        /// The constructor takes a data attribute, and it should be allowable to
        /// set it to an vobject object or an icalendar object, hence we should
        /// do type checking on the data (TODO: but should probably use
        /// isinstance rather than this kind of logic
        if type(data).__module__.startswith("vobject"):
            this._set_vobject_instance(data)
            return this

        if type(data).__module__.startswith("icalendar"):
            this._set_icalendar_instance(data)
            return this

        this._data = vcal.fix(data)
        this._vobject_instance = null
        this._icalendar_instance = null
        return this

    _get_data():
        if this._data:
            return this._data
        elif this._vobject_instance:
            return this._vobject_instance.serialize()
        elif this._icalendar_instance:
            return this._icalendar_instance.to_ical()
        return null

    data = property(_get_data, _set_data,
                    doc="vCal representation of the object")

    _set_vobject_instance(inst):
        this._vobject_instance = inst
        this._data = null
        this._icalendar_instance = null
        return this

    _get_vobject_instance():
        if not this._vobject_instance:
            try {
                this._set_vobject_instance(vobject.readOne(to_unicode(this._get_data())))
            } catch {
                log.critical("Something went wrong while loading icalendar data into the vobject class.  ical url: " + String(this.url))
                raise
        return this._vobject_instance

    vobject_instance = property(_get_vobject_instance, _set_vobject_instance,
                        doc="vobject instance of the object")

    _set_icalendar_instance(inst):
        this._icalendar_instance = inst
        this._data = null
        this._vobject_instance = null
        return this

    _get_icalendar_instance():
        import icalendar
        if not this._icalendar_instance:
            this.icalendar_instance = icalendar.Calendar.from_ical(to_unicode(this.data))
        return this._icalendar_instance

    icalendar_instance = property(_get_icalendar_instance, _set_icalendar_instance,
                        doc="icalendar instance of the object")

    /// for backward-compatibility - may be changed to
    /// icalendar_instance in version 1.0
    instance = vobject_instance

