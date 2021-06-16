import { CalendarData } from "./Elements/CalendarData"
import { CalendarMultiGet } from "./Elements/CalendarMultiGet"
import { CalendarObjectResource } from "./Resources/CalendarObjectResource"
import { Comp } from "./Elements/Comp"
import { CompFilter } from "./Elements/CompFilter"
import { CalendarQuery } from "./Elements/CalendarQuery"
import { DavObject } from "./DavObject"
import { Expand } from "./Elements/Expand"
import { Filter } from "./Elements/Filter"
import { FreeBusy } from "./Resources/FreeBusy"
import { FreeBusyQuery } from "./Elements/FreeBusyQuery"
import { Href } from "./Elements/Href"
import { Journal } from "./Resources/Journal"
import { Prop } from "./Elements/Prop"
import { DisplayName } from "./Elements/DisplayName"
import { GetEtag } from "./Elements/GetEtag"
import { Mkcalendar } from "./Elements/Mkcalendar"
import { SyncCollection } from "./Elements/SyncCollection"
import { SynchronizableCalendarObjectCollection } from "./SynchronizableCalendarObjectCollection"
import { SyncToken } from "./Elements/SyncToken"
import { SyncLevel } from "./Elements/SyncLevel"
import { SupportedCalendarComponentSet } from "./Elements/SupportedCalendarComponentSet"
import { TextMatch } from "./Elements/TextMatch"
import { TimeRange } from "./Elements/TimeRange"
import { Todo } from "./Resources/Todo"

/// Late import, as icalendar is not yet on the official dependency list

import iCalEvent = require("../iCalendar/Event");
import iCalTodo = require("../iCalendar/Todo");
import iCalJournal = require("../iCalendar/Journal");
import iCalFreeBusy = require("../iCalendar/FreeBusy");

export class Calendar extends DavObject
{
    /*
    The `Calendar` object is used to represent a calendar collection.
    Refer to the RFC for details) {    https://tools.ietf.org/html/rfc4791/section-5.3.1
    */
    displayName:DisplayName;

    objects = this.getObjectsBySyncToken

    create(name=null, id=null, supportedCalendarComponentSet=null)
    {
        /*
        Create a new calendar with display name `name` in `parent`.
        */
        if (id == null) {
            id = String(uuid.uuid1())
        }
        this.id = id

        var path = this.parent.url.join(id + '/')
        this.url = path

        // TODO: mkcalendar seems to ignore the body on most servers?
        // at least the name doesn't get set this way.
        // zimbra gives 500 (!) if (body is omitted ...

        var prop = new Prop()
        if (name != null) {
            this.displayName = new DisplayName(name)
            prop += [this.displayName, ]
        }
        if (supportedCalendarComponentSet) {
            var sccs = new SupportedCalendarComponentSet()
            for (let scc of supportedCalendarComponentSet) {
                sccs += Comp(scc)
            }
            prop += sccs
        }
        var set = new Set() + prop

        var mkcol = new Mkcalendar() + set

        var r = this.query(mkcol, 'mkcalendar', path, 201)

        // COMPATIBILITY ISSUE
        // name should already be set, but we've seen caldav servers failing
        // on setting the DisplayName on calendar creation
        // (DAViCal, Zimbra, ...).  Doing an attempt on explicitly setting the
        // display name using PROPPATCH.
        if (name != null) {
            try {
                this.setProperties([this.displayName])
            } catch (error1) {
                /// TODO: investigate.  Those asserts break.
                console.error(error1)
                try {
                    var currentDisplayName = this.getProperty(new DisplayName())
                    Assert(currentDisplayName == name)
                } catch (error2) {
                    console.warning("calendar server does not support display name on calendar?  Ignoring", excInfo=true)
                    throw error2;
                }
            }
        }
    }

    getSupportedComponents()
    {
        /*
        returns a list of component types supported by the calendar, in
        string format (typically ['VJOURNAL', 'VTODO', 'VEVENT'])
        */
        var props = [new SupportedCalendarComponentSet()]
        var response = this.getProperties(props, parseResponseXml=false)
        var responseList = response.getObjectsAndProperties()
        var prop = responseList[unquote(this.url.path)][new SupportedCalendarComponentSet().tag]
        return [supported.get('name') for (let supported of prop)]
    }

    saveWithInvites(ical, attendees, attendeeOptions)
    {
        /*
        sends a schedule request to the server.  Equivalent with saveEvent, addTodo, etc,
        but the attendees will be added to the ical object before sending it to the server.
        */
        /// TODO: method supports raw strings, probably not icalendar nor vobject.
        var obj = this.childClassForData(ical)(data=ical, client=this.client)
        obj.parent = this
        obj.addOrganizer()
        for (let attendee of attendees) {
            obj.addAttendee(attendee, attendeeOptions)
        }
        obj.id = obj.iCalendarInstance.walk('vevent')[0]['uid']
        obj.save()
    }

    saveEvent(ical, noOverwrite=false, noCreate=false)
    {
        /*
        Add a new event to the calendar, with the given ical.

        Parameters) {
         * ical - ical object (text)
        */
        var e = new Event(this.client, data=ical, parent=this)
        e.save(noOverwrite=noOverwrite, noCreate=noCreate, objectType='event')
        return e
    }

    addTodo(ical, noOverwrite=false, noCreate=false)
    {
        /*
        Add a new task to the calendar, with the given ical.

        Parameters) {
         * ical - ical object (text)
        */
        return new Todo(this.client, data=ical, parent=this).save(noOverwrite=noOverwrite, noCreate=noCreate, objectType='todo')
    }

    saveJournal(ical, noOverwrite=false, noCreate=false)
    {
        /*
        Add a new journal entry to the calendar, with the given ical.

        Parameters) {
         * ical - ical object (text)
        */
        return new Journal(this.client, data=ical, parent=this).save(noOverwrite=noOverwrite, noCreate=noCreate, objectType='journal')
    }


    save()
    {
        /*
        The save method for a calendar is only used to create it, for now.
        We know we have to create it when we don't have a url.

        Returns) {
         * this
        */
        if (this.url == null) {
            this.create(name=this.name, id=this.id, this.extraInitializationOptions)
        }
        return this
    }

    calendarMultiGet(eventUrls)
    {
        /*
        get multiple events' data
        @author mtorange@gmail.com
        @type events list of Event
        */
        var rv=[]
        var prop = new Prop() + new CalendarData()
        var root = CalendarMultiGet() + prop + [new Href(value=u.path) for u in eventUrls]
        var response = this.query(root, 1, 'report')
        var results = this.handlePropertyResponse(response=response, props=[new CalendarData()])
        for (let r of results) {
            rv.append( new Event(this.client, this.url.join(r), data=results[r][new CalendarData.tag], parent=this))
        }

        return rv
    }


    buildDateSearchQuery(start, end=null, componentFilter="VEVENT", expand="maybe")
    {
        /*
        Split out from the searchByDate-method below.  The idea is that
        maybe the generated query can be amended, i.e. to filter out
        by category etc.  To be followed up in
        https://github.com/python-caldav/caldav/issues/16
        */
        /// for backward compatibility - expand should be false
        /// in an open-ended date search, otherwise true
        if (expand == 'maybe') {
            expand = end
        }

        // Some servers will raise an error if (we send the expand flag
        // but don't set any end-date - expand doesn't make much sense
        // if (we have one recurring event describing an indefinite
        // series of events.  I think it's appropriate to raise an error
        // in this case.
        var data
        if (!end && expand) {
            console.error("an open-ended date search cannot be expanded")
        } else if (expand) {
            data = new CalendarData() + new Expand(start, end)
        } else {
            data = new CalendarData()
        }
        var prop = new Prop() + data

        var query = new TimeRange(start, end)
        if (componentFilter) {
            query = new CompFilter(componentFilter) + query
        }
        var vcalendar = CompFilter("VCALENDAR") + query
        var filter = new Filter() + vcalendar
        var root = new CalendarQuery() + [prop, filter]
        return root
    }

    searchByDate(start, end=null, componentFilter="VEVENT", expand="maybe")
    {
        // type (TimeStamp, TimeStamp, str, str) -> CalendarObjectResource
        /*
        Search events by date in the calendar. Recurring events are
        expanded if (they are occuring during the specified time frame
        and if (an end timestamp is given.

        Parameters) {
         * start = datetime.today().
         * end = same as above.
         * componentFilter = defaults to events only.  Set to null to fetch all
           calendar components.
         * expand - should recurrent events be expanded?  (to preserve
           backward-compatibility the default "maybe" will be changed into true
           unless the searchByDate is open-ended)

        Returns) {
         * [CalendarObjectResource(), ...]

        */
        // build the query
        var root = this.buildDateSearchQuery(start, end, componentFilter, expand)

        var componentClass
        if (componentFilter == 'VEVENT') {
            componentClass=Event
        } else {
            componentClass = null
        }

        /// xandikos now yields a 5xx-error when trying to pass
        /// expand=true, after I prodded the developer that it doesn't
        /// work.  By now there is some workaround in the test code to
        /// avoid sending expand=true to xandikos, but perhaps we
        /// should run a try-except-retry here with expand=false in the
        /// retry, and warnings logged ... or perhaps not.
        return this.search(root, componentClass)
    }

    requestReportAndBuildResultList(xml, componentClass=null, props=null, noCalendarData=false)
    {
        /*
        Takes some input XML, does a report query on a calendar object
        and returns the resource objects found.

        TODO: similar code is duplicated many places, we ought to do even more code
        refactoring
        */
        var matches = []
        if (props == null) {
            props = [new CalendarData()]
        } else {
            props = [new CalendarData()] + props
        }
        var response = this.query(xml, 1, 'report')
        var results = response.expandSimpleProperties(props)
        for (let r of results) {
            var cdata
            var pdata = results[r]
            if (new CalendarData.tag in pdata) {
                cdata = pdata.pop(new CalendarData.tag)
                if (componentClass == null) {
                    componentClass = this.childClassForData(cdata)
                }
            } else {
                cdata = null
            }
            if (componentClass == null) {
                /// no CalendarData fetched - which is normal i.e. when doing a sync-token report and only asking for the URLs
                componentClass = CalendarObjectResource
            }
            var url = URL(r)
            if (url.hostname == null) {
                // Quote when result is not a full URL
                url = quote(r)
            }
            /// icloud hack - icloud returns the calendar URL as well as the calendar item URLs
            if (this.url.join(url) == this.url) {
                continue
            }
            matches.append(
                componentClass(this.client, url=this.url.join(url),data=cdata, parent=this, props=pdata))
        }

        return [response, matches]
    }

    search(xml, componentClass=null)
    {
        /*
        This method was partly written to approach
        https://github.com/python-caldav/caldav/issues/16 This is a
        result of some code refactoring, and after the next round of
        refactoring we've ended up with this) {
        */
        var [response, objects] = this.requestReportAndBuildResultList(xml, componentClass)
        return objects
    }

    getFreeBusy(start, end)
    {
        /*
        Search the calendar, but return only the free/busy information.

        Parameters) {
         * start = datetime.today().
         * end = same as above.

        Returns) {
         * [FreeBusy(), ...]

        */

        var root = new FreeBusyQuery() + [new TimeRange(start, end)]
        var response = this.query(root, 1, 'report')
        return new FreeBusy(response.raw)
    }

    fetchTodos(filters)
    {
        // ref https://www.ietf.org/rfc/rfc4791.txt, section 7.8.9
        var matches = []

        // build the request
        var data = new CalendarData()
        var prop = new Prop() + data

        var vcalendar = new CompFilter("VCALENDAR") + filters
        var filter = new Filter() + vcalendar

        var root = new CalendarQuery() + [prop, filter]

        return this.search(root, componentClass=Todo)
    }

    todos(sortKeys=['due', 'priority'], includeCompleted=false, sortKey=null)
    {
        /*
        fetches a list of todo events.

        Parameters) {
         * sortKeys: use this field in the VTODO for sorting (iterable of
           lower case string, i.e. ('priority','due')).
         * includeCompleted: boolean -
           by default, only pending tasks are listed
         * sortKey: DEPRECATED, for backwards compatibility with version 0.4.
        */
        if (sortKey) {
            sortKeys = [sortKey,]
        }

        var matches

        if (!includeCompleted) {
            var vnotcompleted = new TextMatch('COMPLETED', negate=true)
            var vnotcancelled = new TextMatch('CANCELLED', negate=true)
            var vstatusNotCompleted = cPropFilter('STATUS') + vnotcompleted
            var vstatusNotCancelled = cPropFilter('STATUS') + vnotcancelled
            var vstatusNotDefined = cPropFilter('STATUS') + new NotDefined()
            var vnocompletedate = cPropFilter('COMPLETED') + new NotDefined()
            var filters1 = (new CompFilter("VTODO") + vnocompletedate +
                        vstatusNotCompleted + vstatusNotCancelled)
            /// This query is quite much in line with https://tools.ietf.org/html/rfc4791/section-7.8.9
            var matches1 = this.fetchTodos(filters1)
            /// However ... some server implementations (i.e. NextCloud
            /// and Baikal) will yield "false" on a negated TextMatch
            /// if (the field is not defined.  Hence, for those
            /// implementations we need to turn back and ask again
            /// ... do you have any VTODOs for us where the STATUS
            /// field is not defined? (ref
            /// https://github.com/python-caldav/caldav/issues/14)
            var filters2 = (new CompFilter("VTODO") + vnocompletedate +
                        vstatusNotDefined)
            var matches2 = this.fetchTodos(filters2)

            /// For most caldav servers, everything in matches2 already exists
            /// in matches1.  We need to make a union ...
            var matchSet = new Set()
            matches = []
            for (let todo of matches1 + matches2) {
                if (!(todo.url in matchSet)) {
                    matchSet.add(todo.url)
                    /// and still, Zimbra seems to deliver too many TODOs on the
                    /// filter2 ... let's do some post-filtering in case the
                    /// server fails in filtering things the right way
                    if (!('\nCOMPLETED:' in todo.data) &&
                        !('\nSTATUS:COMPLETED' in todo.data) &&
                        !('\nSTATUS:CANCELLED' in todo.data)) {
                        matches.append(todo)
                    }
                }
            }

        } else {
            var filters = new CompFilter("VTODO")
            matches = this.fetchTodos(filters)
        }
        if (sortKeys) {
            matches.sort(this.doSortKeys())
        }
        return matches
    }

    doSortKeys(x) {
        var ret = []
        var vtodo = x.instance.vtodo
        var now = new Date()
        var defaults = {
            'due': '2050-01-01',
            'dtstart': '1970-01-01',
            'priority': '0',
            // JA: why compare datetime.strftime('%F%H%M%S')
            // JA: and not simply datetime?

            // tobixen: probably it was made like this because we can get
            // both dates and timestamps from the objects.
            // Python will yield an exception if (trying to compare
            // a timestamp with a date.
            'isnt_overdue':
                !(vtodo.hasOwnProperty('due') &&
                    vtodo.due.value.getTime() <
                    now.getTime()),

            'hasnt_started':
                (vtodo.hasOwnProperty('dtstart') &&
                    vtodo.dtstart.value.getTime() >
                    now.getTime())

        }
        for (let sortKey of sortKeys) {
            var val = vtodo.getOwnProperty(sortKey)
            if (val == null) {
                ret.append(defaults.get(sortKey, '0'))
                continue
            }
            val = val.value
            if (val.hasOwnProperty('strftime')) {
                ret.append(val.strftime('%F%H%M%S'))
            } else {
                ret.append(val)
            }
        }
        return ret
    }

    childClassForData(data)
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
        }
        if (data.hasOwnProperty('split')) {
            for (let line of data.split('\n')) {
                line = line.strip()
                if (line == 'BEGIN:VEVENT') {
                    return Event
                }
                if (line == 'BEGIN:VTODO') {
                    return Todo
                }
                if (line == 'BEGIN:VJOURNAL') {
                    return Journal
                }
                if (line == 'BEGIN:VFREEBUSY') {
                    return FreeBusy
                }
            }
        } else if (data.hasOwnProperty('subcomponents')) {
            if (!data.subcomponents.length) {
                return CalendarObjectResource
            }

            for (let sc of data.subcomponents) {
                if (sc instanceof iCalEvent) {
                    return Event;
                }
                if (sc instanceof iCalTodo) {
                    return Todo;
                }
                if (sc instanceof iCalJournal) {
                    return Journal;
                }
                if (sc instanceof iCalFreeBusy) {
                    return FreeBusy;
                }
            }
        }
        return CalendarObjectResource
    }

    getEventByUrl(href, data=null)
    {
        /*
        Returns the event with the given URL
        */
        return new Event(url=href, data=data, parent=this).load()
    }

    getObjectByUid(uid, componentFilter=null)
    {
        /*
        Get one event from the calendar.

        Parameters) {
         * uid: the event uid

        Returns) {
         * Event() or null
        */
        var data = new CalendarData()
        var prop = new Prop() + data

        var query = new TextMatch(uid)
        query = cPropFilter("UID") + query
        if (componentFilter) {
            query = componentFilter + query
        }
        var vcalendar = new CompFilter("VCALENDAR") + query
        var filter = new Filter() + vcalendar

        var root = new CalendarQuery() + [prop, filter]

        var itemsFound
        try {
            itemsFound = this.search(root)
        } catch (error) {
            console.error("The getObjectByUid is not compatible with some server implementations.  work in progress.");
            throw error;
        }

        // Ref Lucas Verney, we've actually done a substring search, if (the
        // uid given in the query is short (i.e. just "0") we're likely to
        // get false positives back from the server, we need to do an extra
        // check that the uid is correct
        for (let item of itemsFound) {
            // Long uids are folded, so splice the lines together here before
            // attempting a match.
            var itemUid = RegExp.search(r'\nUID:((.|\n[ \t])*)\n', item.data)
            if (!itemUid ||
                    RegExp.sub(r'\n[ \t]', '', itemUid.group(1)) != uid) {
                continue
            }
            return item
        }
        console.error.(`${uid} not found on server`)
    }

    getTodoByUid(uid)
    {
        return this.getObjectByUid(uid, new CompFilter("VTODO"));
    }

    getEventByUid(uid)
    {
        return this.getObjectByUid(uid, new CompFilter("VEVENT"))
    }

    getJournalByUid(uid)
    {
        return this.getObjectByUid(uid, new CompFilter("VJOURNAL"))
    }

    getAllEvents()
    {
        /*
        List all events from the calendar.

        Returns) {
         * [Event(), ...]
        */
        var data = new CalendarData()
        var prop = Prop() + data
        var vevent = new CompFilter("VEVENT")
        var vcalendar = new CompFilter("VCALENDAR") + vevent
        var filter = new Filter() + vcalendar
        var root = new CalendarQuery() + [prop, filter]
        
        return this.search(root, Event)
    }

    getObjectsBySyncToken(syncToken=null, loadObjects=false)
    {
        /*getObjectsBySyncToken aka objects

        Do a sync-collection report, ref RFC 6578 and
        https://github.com/python-caldav/caldav/issues/87

        This method will return all objects in the calendar if no
        syncToken is passed (the method should then be referred to as
        "objects"), or if the syncToken is unknown to the server.  If
        a sync-token known by the server is passed, it will return
        objects that are added, deleted or modified since last time
        the sync-token was set.

        if loadObjects is set to true, the objects will be loaded -
        otherwise empty CalendarObjectResource objects will be returned.

        This method will return a SynchronizableCalendarObjectCollection object, which is
        an iterable.
        */
        var cmd = new SyncCollection()
        var token = new SyncToken(syncToken)
        var level = new SyncLevel('1')
        var props = new Prop() + new GetEtag()
        var root = cmd + [level, token, props]
        var [response, objects] = this.requestReportAndBuildResultList(root, props=[new GetEtag()], noCalendarData=true)]
        /// TODO: look more into this, I think syncToken should be directly available through response object
        try {
            syncToken = response.syncToken
        } catch (error) {
            console.error(error)
            syncToken = response.tree.findall('.\/\/' + SyncToken.tag)[0].text
        }

        /// this is not quite right - the etag we've fetched can already be outdated
        if (loadObjects) {
            for (let obj of objects) {
                try {
                    obj.load()
                } catch (error) {
                    /// The object was deleted
                    console.error(error);
                }
            }
        }
        return new SynchronizableCalendarObjectCollection(calendar=this, objects=objects, syncToken=syncToken)
    }

    getAllJournals()
    {
        /*
        List all journals from the calendar.

        Returns) {
         * [Journal(), ...]
        */
        // TODO: this is basically a copy of getAllEvents() - can we do more
        // refactoring and consolidation here?  Maybe it's wrong to do
        // separate methods for journals, todos and events?
        var data = new CalendarData()
        var prop = new Prop() + data
        var vevent = new CompFilter("VJOURNAL")
        var vcalendar = new CompFilter("VCALENDAR") + vevent
        var filter = new Filter() + vcalendar
        var root = new CalendarQuery() + [prop, filter]

        return this.search(root, Journal)
    }
}