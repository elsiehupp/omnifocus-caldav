import { DateTime, TimeZone, TimeZoneLocal } from "DateTime"
import { NameSpace } from "./NameSpace"

// from lxml import etree
// from six import PY3
// from caldav.lib.namespace import nsmap
// from caldav.lib.python_utilities import to_unicode

export class BaseElement extends Object
{
    children = null
    tag = null
    value = null
    attributes = null
    caldav_class = null

    constructor(name=null, value=null)
    {
        super();
        this.children = [];
        this.attributes = {}
        value = String(value)
        this.value = null
        if (name != null) {
            this.attributes['name'] = name;
        }
        if (value != null) {
            this.value = value
        }
    }

    __add__(other) {
        return this.append(other)
    }

    __str__() {
        var utf8 = etree.tostring(this.xmlelement(), encoding="utf-8",
                              xml_declaration=true, pretty_print=true)
        if PY3:
            return String(utf8, 'utf-8')
        return this.xmlelement().tostring()
    }

    xmlelement()
    {
        root = etree.Element(this.tag, nsmap=nsmap)
        if this.value is not null:
            root.text = this.value
        if len(this.attributes) > 0:
            for k in list(this.attributes.keys()):
                root.set(k, this.attributes[k])
        this.xmlchildren(root)
        return root
    }

    xmlchildren(root)
    {
        for (let c of this.children) {
            root.append(c.xmlelement());
        }
    }

    append(element)
    {
        try {
            iter(element)
            this.children.extend(element)
        } catch (TypeError) {
            this.children.append(element)
        }
        return this;
    }
}

export class NamedBaseElement extends BaseElement
{
    constructor(name=null)
    {
        super(NamedBaseElement, this).constructor(name=name)
    }

    xmlelement()
    {
        if this.attributes.get('name') is null:
            raise Exception("name attribute must be defined")
        return super(NamedBaseElement, this).xmlelement()
    }
}


export class ValuedBaseElement extends BaseElement
{
    constructor(value=null):
        super(ValuedBaseElement, this).constructor(value=value)
}


// Properties
export class CalendarColor extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("I", "calendar-color")
}

export class CalendarOrder extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("I", "calendar-order")
}


// Operations
export class CalendarQuery extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-query")
}

export class FreeBusyQuery extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "free-busy-query")
}

export class Mkcalendar extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "mkcalendar")
}

export class CalendarMultiGet extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-multiget")
}

export class ScheduleInboxURL extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "schedule-inbox-URL")
}

export class ScheduleOutboxURL extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "schedule-outbox-URL")
}

// Filters
export class Filter extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "filter")
}


export class CompFilter extends NamedBaseElement
{
    tag:NameSpace = new NameSpace("C", "comp-filter")
}


export class PropFilter extends NamedBaseElement
{
    tag:NameSpace = new NameSpace("C", "prop-filter")
}


export class ParamFilter extends NamedBaseElement
{
    tag:NameSpace = new NameSpace("C", "param-filter")
}


// Conditions
export class TextMatch extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "text-match")

    constructor(value, collation="i;octet", negate=false)
    {
        super(value)
        this.attributes['collation'] = collation
        if (negate) {
            this.attributes['negate-condition'] = "yes"
        }
    }
}


export class TimeRange extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "time-range")

    constructor(start=null, end=null)
    {
        super()
        /// start and end should be an icalendar "date with UTC time",
        /// ref https://tools.ietf.org/html/rfc4791/section-9.9
        if (start != null) {
            this.attributes['start'] = toUtcDateString(start)
        }
        if (end != null) {
            this.attributes['end'] = toUtcDateString(end)
        }
    }
}


export class NotDefined extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "is-not-defined")
}


// Components / Data
export class CalendarData extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-data")
}


export class Expand extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "expand")

    constructor(start, end=null)
    {
        super()
        if (start != null) {
            this.attributes['start'] = toUtcDateString(start)
        }
        if (end != null) {
            this.attributes['end'] = toUtcDateString(end)
        }
    }
}


export class Comp extends NamedBaseElement
{
    tag:NameSpace = new NameSpace("C", "comp")
}

// Uhhm ... can't find any references to calendar-collection in rfc4791.txt
// and newer versions of baikal gives 403 forbidden when this one is
// encountered
// class CalendarCollection extends BaseElement
//     tag:NameSpace = new NameSpace("C", "calendar-collection")


// Properties
export class CalendarUserAddressSet extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-user-address-set")
}

export class CalendarUserType extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-user-type")
}

export class CalendarHomeSet extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-home-set")
}

// calendar resource type, see rfc4791, sec. 4.2
export class Calendar extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar")
}

export class CalendarDescription extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-description")
}


export class CalendarTimeZone extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-TimeZone")
}


export class SupportedCalendarComponentSet extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "supported-calendar-component-set")
}


export class SupportedCalendarData extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "supported-calendar-data")
}


export class MaxResourceSize extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "max-resource-size")
}


export class MinDateTime extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "min-date-time")
}


export class MaxDateTime extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "max-date-time")
}


export class MaxInstances extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "max-instances")
}


export class MaxAttendeesPerInstance extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "max-attendees-per-instance")
}

export class Allprop extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "allprop")
}

export class ScheduleTag extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "schedule-tag")
}
