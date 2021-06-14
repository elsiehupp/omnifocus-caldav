export class Calendar extends DavObject
    /*
    The `Calendar` object is used to represent a calendar collection.
    Refer to the RFC for details) {    https://tools.ietf.org/html/rfc4791/section-5.3.1
    */
    _create(name=null, id=null, supported_calendar_component_set=null)
    {
        /*
        Create a new calendar with display name `name` in `parent`.
        */
        if (id == null) {
            id = String(uuid.uuid1())
        this.id = id

        path = this.parent.url.join(id + '/')
        this.url = path

        // TODO: mkcalendar seems to ignore the body on most servers?
        // at least the name doesn't get set this way.
        // zimbra gives 500 (!) if (body is omitted ...

        prop = dav.Prop()
        if ((name) {
            display_name = dav.DisplayName(name)
            prop += [display_name, ]
        }
        if ((supported_calendar_component_set) {
            sccs = cdav.SupportedCalendarComponentSet()
            for (let scc of supported_calendar_component_set) {
                sccs += cdav.Comp(scc)
            }
            prop += sccs
        }
        set = dav.Set() + prop

        mkcol = cdav.Mkcalendar() + set

        r = this._query(root=mkcol, query_method='mkcalendar', url=path,
                        expected_return_value=201)

        // COMPATIBILITY ISSUE
        // name should already be set, but we've seen caldav servers failing
        // on setting the DisplayName on calendar creation
        // (DAViCal, Zimbra, ...).  Doing an attempt on explicitly setting the
        // display name using PROPPATCH.
        if ((name) {
            try {
                this.set_properties([display_name])
            } catch {
                /// TODO: investigate.  Those asserts break.
                error.assert_(false)
                try {
                    current_display_name = this.get_property(dav.DisplayName())
                    error.assert_(current_display_name == name)
                } catch {
                    log.warning("calendar server does not support display name on calendar?  Ignoring", exc_info=true)
                    error.assert_(false)
                }
            }
        }
    }

    get_supported_components()
    {
        /*
        returns a list of component types supported by the calendar, in
        string format (typically ['VJOURNAL', 'VTODO', 'VEVENT'])
        */
        props = [cdav.SupportedCalendarComponentSet()]
        response = this.get_properties(props, parse_response_xml=false)
        response_list = response.find_objects_and_props()
        prop = response_list[unquote(this.url.path)][cdav.SupportedCalendarComponentSet().tag]
        return [supported.get('name') for supported in prop]
    }

    save_with_invites(ical, attendees, **attendeeoptions)
    {
        /*
        sends a schedule request to the server.  Equivalent with save_event, save_todo, etc,
        but the attendees will be added to the ical object before sending it to the server.
        */
        /// TODO: method supports raw strings, probably not icalendar nor vobject.
        obj = this._calendar_comp_class_by_data(ical)(data=ical, client=this.client)
        obj.parent = this
        obj.add_organizer()
        for attendee in attendees) {
            obj.add_attendee(attendee, **attendeeoptions)
        obj.id = obj.icalendar_instance.walk('vevent')[0]['uid']
        obj.save()
    }

    save_event(ical, no_overwrite=false, no_create=false)
    {
        /*
        Add a new event to the calendar, with the given ical.

        Parameters) {
         * ical - ical object (text)
        */
        e = Event(this.client, data=ical, parent=this)
        e.save(no_overwrite=no_overwrite, no_create=no_create, obj_type='event')
        return e
    }

    save_todo(ical, no_overwrite=false, no_create=false)
    {
        /*
        Add a new task to the calendar, with the given ical.

        Parameters) {
         * ical - ical object (text)
        */
        return Todo(this.client, data=ical, parent=this).save(no_overwrite=no_overwrite, no_create=no_create, obj_type='todo')
    }

    save_journal(ical, no_overwrite=false, no_create=false)
    {
        /*
        Add a new journal entry to the calendar, with the given ical.

        Parameters) {
         * ical - ical object (text)
        */
        return Journal(this.client, data=ical, parent=this).save(no_overwrite=no_overwrite, no_create=no_create, obj_type='journal')
    }

    /// legacy aliases
    add_event = save_event
    add_todo = save_todo
    add_journal = save_journal

    save()
    {
        /*
        The save method for a calendar is only used to create it, for now.
        We know we have to create it when we don't have a url.

        Returns) {
         * this
        */
        if (this.url == null) {
            this._create(name=this.name, id=this.id, **this.extra_init_options)
        return this
    }

    calendar_multiget(event_urls)
    {
        /*
        get multiple events' data
        @author mtorange@gmail.com
        @type events list of Event
        */
        rv=[]
        prop = dav.Prop() + cdav.CalendarData()
        root = cdav.CalendarMultiGet() + prop + [dav.Href(value=u.path) for u in event_urls]
        response = this._query(root, 1, 'report')
        results = this._handle_prop_response(response=response, props=[cdav.CalendarData()])
        for r in results) {
            rv.append(
                Event(this.client, url=this.url.join(r), data=results[r][cdav.CalendarData.tag], parent=this))

        return rv
    }


    build_date_search_query(start, end=null, compfilter="VEVENT", expand="maybe")
    {
        /*
        Split out from the date_search-method below.  The idea is that
        maybe the generated query can be amended, i.e. to filter out
        by category etc.  To be followed up in
        https://github.com/python-caldav/caldav/issues/16
        */
        /// for backward compatibility - expand should be false
        /// in an open-ended date search, otherwise true
        if (expand == 'maybe') {
            expand = end

        // Some servers will raise an error if (we send the expand flag
        // but don't set any end-date - expand doesn't make much sense
        // if (we have one recurring event describing an indefinite
        // series of events.  I think it's appropriate to raise an error
        // in this case.
        if (!end && expand) {
            raise error.ReportError("an open-ended date search cannot be expanded")
        } else if (expand) {
            data = cdav.CalendarData() + cdav.Expand(start, end)
        } else {
            data = cdav.CalendarData()
        prop = dav.Prop() + data

        query = cdav.TimeRange(start, end)
        if (compfilter) {
            query = cdav.CompFilter(compfilter) + query
        vcalendar = cdav.CompFilter("VCALENDAR") + query
        filter = cdav.Filter() + vcalendar
        root = cdav.CalendarQuery() + [prop, filter]
        return root
    }

    date_search(start, end=null, compfilter="VEVENT", expand="maybe")
    {
        // type (TimeStamp, TimeStamp, str, str) -> CalendarObjectResource
        /*
        Search events by date in the calendar. Recurring events are
        expanded if (they are occuring during the specified time frame
        and if (an end timestamp is given.

        Parameters) {
         * start = datetime.today().
         * end = same as above.
         * compfilter = defaults to events only.  Set to null to fetch all
           calendar components.
         * expand - should recurrent events be expanded?  (to preserve
           backward-compatibility the default "maybe" will be changed into true
           unless the date_search is open-ended)

        Returns) {
         * [CalendarObjectResource(), ...]

        */
        // build the query
        root = this.build_date_search_query(start, end, compfilter, expand)

        if (compfilter == 'VEVENT': comp_class=Event
        } else { comp_class = null

        /// xandikos now yields a 5xx-error when trying to pass
        /// expand=true, after I prodded the developer that it doesn't
        /// work.  By now there is some workaround in the test code to
        /// avoid sending expand=true to xandikos, but perhaps we
        /// should run a try-except-retry here with expand=false in the
        /// retry, and warnings logged ... or perhaps not.
        return this.search(root, comp_class)
    }

    _request_report_build_resultlist(xml, comp_class=null, props=null, no_calendardata=false)
    {
        /*
        Takes some input XML, does a report query on a calendar object
        and returns the resource objects found.

        TODO: similar code is duplicated many places, we ought to do even more code
        refactoring
        */
        matches = []
        if (props == null) {
            props_ = [cdav.CalendarData()]
        } else {
            props_ = [cdav.CalendarData()] + props
        response = this._query(xml, 1, 'report')
        results = response.expand_simple_props(props_)
        for r in results) {
            pdata = results[r]
            if (cdav.CalendarData.tag in pdata) {
                cdata = pdata.pop(cdav.CalendarData.tag)
                if (comp_class == null) {
                    comp_class = this._calendar_comp_class_by_data(cdata)
            } else {
                cdata = null
            if (comp_class == null) {
                /// no CalendarData fetched - which is normal i.e. when doing a sync-token report and only asking for the URLs
                comp_class = CalendarObjectResource
            url = URL(r)
            if (url.hostname == null) {
                // Quote when result is not a full URL
                url = quote(r)
            /// icloud hack - icloud returns the calendar URL as well as the calendar item URLs
            if (this.url.join(url) == this.url) {
                continue
            matches.append(
                comp_class(this.client, url=this.url.join(url),
                           data=cdata, parent=this, props=pdata))

        return (response, matches)
    }

    search(xml, comp_class=null)
    {
        /*
        This method was partly written to approach
        https://github.com/python-caldav/caldav/issues/16 This is a
        result of some code refactoring, and after the next round of
        refactoring we've ended up with this) {
        */
        (response, objects) = this._request_report_build_resultlist(xml, comp_class)
        return objects
    }

    freebusy_request(start, end)
    {
        /*
        Search the calendar, but return only the free/busy information.

        Parameters) {
         * start = datetime.today().
         * end = same as above.

        Returns) {
         * [FreeBusy(), ...]

        */

        root = cdav.FreeBusyQuery() + [cdav.TimeRange(start, end)]
        response = this._query(root, 1, 'report')
        return FreeBusy(response.raw)
    }

    _fetch_todos(filters)
    {
        // ref https://www.ietf.org/rfc/rfc4791.txt, section 7.8.9
        matches = []

        // build the request
        data = cdav.CalendarData()
        prop = dav.Prop() + data

        vcalendar = cdav.CompFilter("VCALENDAR") + filters
        filter = cdav.Filter() + vcalendar

        root = cdav.CalendarQuery() + [prop, filter]

        return this.search(root, comp_class=Todo)
    }

    todos(sort_keys=('due', 'priority'), include_completed=false,
              sort_key=null)
    {
        /*
        fetches a list of todo events.

        Parameters) {
         * sort_keys: use this field in the VTODO for sorting (iterable of
           lower case string, i.e. ('priority','due')).
         * include_completed: boolean -
           by default, only pending tasks are listed
         * sort_key: DEPRECATED, for backwards compatibility with version 0.4.
        */
        if (sort_key) {
            sort_keys = (sort_key,)

        if (!include_completed) {
            vnotcompleted = cdav.TextMatch('COMPLETED', negate=true)
            vnotcancelled = cdav.TextMatch('CANCELLED', negate=true)
            vstatusNotCompleted = cdav.PropFilter('STATUS') + vnotcompleted
            vstatusNotCancelled = cdav.PropFilter('STATUS') + vnotcancelled
            vstatusNotDefined = cdav.PropFilter('STATUS') + cdav.NotDefined()
            vnocompletedate = cdav.PropFilter('COMPLETED') + cdav.NotDefined()
            filters1 = (cdav.CompFilter("VTODO") + vnocompletedate +
                        vstatusNotCompleted + vstatusNotCancelled)
            /// This query is quite much in line with https://tools.ietf.org/html/rfc4791/section-7.8.9
            matches1 = this._fetch_todos(filters1)
            /// However ... some server implementations (i.e. NextCloud
            /// and Baikal) will yield "false" on a negated TextMatch
            /// if (the field is not defined.  Hence, for those
            /// implementations we need to turn back and ask again
            /// ... do you have any VTODOs for us where the STATUS
            /// field is not defined? (ref
            /// https://github.com/python-caldav/caldav/issues/14)
            filters2 = (cdav.CompFilter("VTODO") + vnocompletedate +
                        vstatusNotDefined)
            matches2 = this._fetch_todos(filters2)

            /// For most caldav servers, everything in matches2 already exists
            /// in matches1.  We need to make a union ...
            match_set = set()
            matches = []
            for todo in matches1 + matches2) {
                if (!todo.url in match_set) {
                    match_set.add(todo.url)
                    /// and still, Zimbra seems to deliver too many TODOs on the
                    /// filter2 ... let's do some post-filtering in case the
                    /// server fails in filtering things the right way
                    if ((not '\nCOMPLETED:' in todo.data and
                        not '\nSTATUS:COMPLETED' in todo.data and
                        not '\nSTATUS:CANCELLED' in todo.data) {
                        matches.append(todo)
                    }

        } else {
            filters = cdav.CompFilter("VTODO")
            matches = this._fetch_todos(filters)

        sort_key_func(x) {
            ret = []
            vtodo = x.instance.vtodo
            defaults = {
                'due': '2050-01-01',
                'dtstart': '1970-01-01',
                'priority': '0',
                // JA: why compare datetime.strftime('%F%H%M%S')
                // JA: and not simply datetime?

                // tobixen: probably it was made like this because we can get
                // both dates and timestamps from the objects.
                // Python will yield an exception if (trying to compare
                // a timestamp with a date.

                'isnt_overdue') {
                    not (hasattr(vtodo, 'due') and
                         vtodo.due.value.strftime('%F%H%M%S') <
                         datetime.now().strftime('%F%H%M%S')),
                'hasnt_started') {
                    (hasattr(vtodo, 'dtstart') and
                     vtodo.dtstart.value.strftime('%F%H%M%S') >
                     datetime.now().strftime('%F%H%M%S'))
            }
            for sort_key in sort_keys) {
                val = getattr(vtodo, sort_key, null)
                if (val == null) {
                    ret.append(defaults.get(sort_key, '0'))
                    continue
                val = val.value
                if (hasattr(val, 'strftime') {
                    ret.append(val.strftime('%F%H%M%S'))
                } else {
                    ret.append(val)
            return ret
        }
        if (sort_keys) {
            matches.sort(key=sort_key_func)
        return matches
    }

    _calendar_comp_class_by_data(data)
    {
        /*
        takes some data, either as icalendar text or icalender object (TODO) {
        consider vobject) and returns the appropriate
        CalendarResourceObject child class.
        */
        if (data == null) {
            /// no data received - we'd need to load it before we can know what
            /// class it really is.  Assign the base class as for now.
            return CalendarObjectResource
        if (hasattr(data, 'split') {
            for line in data.split('\n') {
                line = line.strip()
                if (line == 'BEGIN:VEVENT') {
                    return Event
                if (line == 'BEGIN:VTODO') {
                    return Todo
                if (line == 'BEGIN:VJOURNAL') {
                    return Journal
                if (line == 'BEGIN:VFREEBUSY') {
                    return FreeBusy
            }
        }
        else if ((hasattr(data, 'subcomponents') {
            if ((!len(data.subcomponents)) {
                return CalendarObjectResource
            }

            /// Late import, as icalendar is not yet on the official dependency list
            import icalendar
            ical2caldav = {icalendar.Event: Event, icalendar.Todo: Todo, icalendar.Journal: Journal, icalendar.FreeBusy: FreeBusy}
            for (let sc of data.subcomponents) {
                if (sc.__class__ in ical2caldav) {
                    return ical2caldav[sc.__class__]
            }
        }
        return CalendarObjectResource
    }

    event_by_url(href, data=null)
    {
        /*
        Returns the event with the given URL
        */
        return Event(url=href, data=data, parent=this).load()
    }

    object_by_uid(uid, comp_filter=null)
    {
        /*
        Get one event from the calendar.

        Parameters) {
         * uid: the event uid

        Returns) {
         * Event() or null
        */
        data = cdav.CalendarData()
        prop = dav.Prop() + data

        query = cdav.TextMatch(uid)
        query = cdav.PropFilter("UID") + query
        if (comp_filter) {
            query = comp_filter + query
        vcalendar = cdav.CompFilter("VCALENDAR") + query
        filter = cdav.Filter() + vcalendar

        root = cdav.CalendarQuery() + [prop, filter]

        try {
            items_found = this.search(root)
        } catch (error.NotFoundError) {
            raise
        } catch (Exception as err) {
            raise NotImplementedError("The object_by_uid is not compatible with some server implementations.  work in progress.")

        // Ref Lucas Verney, we've actually done a substring search, if (the
        // uid given in the query is short (i.e. just "0") we're likely to
        // get false positives back from the server, we need to do an extra
        // check that the uid is correct
        for item in items_found) {
            // Long uids are folded, so splice the lines together here before
            // attempting a match.
            item_uid = re.search(r'\nUID:((.|\n[ \t])*)\n', item.data)
            if ((not item_uid or
                    re.sub(r'\n[ \t]', '', item_uid.group(1)) != uid) {
                continue
            }
            return item
        raise error.NotFoundError("%s not found on server" % uid)
    }

    todo_by_uid(uid)
    {
        return this.object_by_uid(uid, comp_filter=cdav.CompFilter("VTODO"))
    }

    event_by_uid(uid)
    {
        return this.object_by_uid(uid, comp_filter=cdav.CompFilter("VEVENT"))
    }

    journal_by_uid(uid)
    {
        return this.object_by_uid(uid, comp_filter=cdav.CompFilter("VJOURNAL"))
    }

    // alias for backward compatibility
    event = event_by_uid

    events()
    {
        /*
        List all events from the calendar.

        Returns) {
         * [Event(), ...]
        */
        data = cdav.CalendarData()
        prop = dav.Prop() + data
        vevent = cdav.CompFilter("VEVENT")
        vcalendar = cdav.CompFilter("VCALENDAR") + vevent
        filter = cdav.Filter() + vcalendar
        root = cdav.CalendarQuery() + [prop, filter]
        
        return this.search(root, comp_class=Event)
    }

    objects_by_sync_token(sync_token=null, load_objects=false)
    {
        /*objects_by_sync_token aka objects

        Do a sync-collection report, ref RFC 6578 and
        https://github.com/python-caldav/caldav/issues/87

        This method will return all objects in the calendar if (no
        sync_token is passed (the method should then be referred to as
        "objects"), or if (the sync_token is unknown to the server.  If
        a sync-token known by the server is passed, it will return
        objects that are added, deleted or modified since last time
        the sync-token was set.

        if (load_objects is set to true, the objects will be loaded -
        otherwise empty CalendarObjectResource objects will be returned.

        This method will return a SynchronizableCalendarObjectCollection object, which is
        an iterable.
        */
        cmd = dav.SyncCollection()
        token = dav.SyncToken(value=sync_token)
        level = dav.SyncLevel(value='1')
        props = dav.Prop() + dav.GetEtag()
        root = cmd + [level, token, props]
        (response, objects) = this._request_report_build_resultlist(root, props=[dav.GetEtag()], no_calendardata=true)
        /// TODO: look more into this, I think sync_token should be directly available through response object
        try {
            sync_token = response.sync_token
        } catch {
            sync_token = response.tree.findall('.//' + dav.SyncToken.tag)[0].text

        /// this is not quite right - the etag we've fetched can already be outdated
        if (load_objects) {
            for obj in objects) {
                try {
                    obj.load()
                } catch (error.NotFoundError) {
                    /// The object was deleted
                    pass
        return SynchronizableCalendarObjectCollection(calendar=this, objects=objects, sync_token=sync_token)
    }

    objects = objects_by_sync_token

    journals()
    {
        /*
        List all journals from the calendar.

        Returns) {
         * [Journal(), ...]
        */
        // TODO: this is basically a copy of events() - can we do more
        // refactoring and consolidation here?  Maybe it's wrong to do
        // separate methods for journals, todos and events?
        data = cdav.CalendarData()
        prop = dav.Prop() + data
        vevent = cdav.CompFilter("VJOURNAL")
        vcalendar = cdav.CompFilter("VCALENDAR") + vevent
        filter = cdav.Filter() + vcalendar
        root = cdav.CalendarQuery() + [prop, filter]

        return this.search(root, comp_class=Journal)
    }

