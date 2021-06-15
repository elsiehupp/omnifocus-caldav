export class TypesFactory(CaselessDict):
    """All Value types defined in rfc 2445 are registered in this factory
    class.

    The value and parameter names don't overlap. So one factory is enough for
    both kinds.
    """

    def __init__(self, *args, **kwargs):
        "Set keys to upper for initial dict"
        super(TypesFactory, self).__init__(*args, **kwargs)
        self.all_types = (
            vBinary,
            vBoolean,
            vCalAddress,
            vDDDLists,
            vDDDTypes,
            vDate,
            vDatetime,
            vDuration,
            vFloat,
            vFrequency,
            vGeo,
            vInline,
            vInt,
            vPeriod,
            vRecur,
            vText,
            vTime,
            vUTCOffset,
            vUri,
            vWeekday,
            vCategory,
        )
        self['binary'] = vBinary
        self['boolean'] = vBoolean
        self['cal-address'] = vCalAddress
        self['date'] = vDDDTypes
        self['date-time'] = vDDDTypes
        self['duration'] = vDDDTypes
        self['float'] = vFloat
        self['integer'] = vInt
        self['period'] = vPeriod
        self['recur'] = vRecur
        self['text'] = vText
        self['time'] = vTime
        self['uri'] = vUri
        self['utc-offset'] = vUTCOffset
        self['geo'] = vGeo
        self['inline'] = vInline
        self['date-time-list'] = vDDDLists
        self['categories'] = vCategory

    /////////////////////////////////////////////////
    // Property types

    // These are the default types
    types_map = CaselessDict({
        ////////////////////////////////////
        // Property value types
        // Calendar Properties
        'calscale': 'text',
        'method': 'text',
        'prodid': 'text',
        'version': 'text',
        // Descriptive Component Properties
        'attach': 'uri',
        'categories': 'categories',
        'class': 'text',
        'comment': 'text',
        'description': 'text',
        'geo': 'geo',
        'location': 'text',
        'percent-complete': 'integer',
        'priority': 'integer',
        'resources': 'text',
        'status': 'text',
        'summary': 'text',
        // Date and Time Component Properties
        'completed': 'date-time',
        'dtend': 'date-time',
        'due': 'date-time',
        'dtstart': 'date-time',
        'duration': 'duration',
        'freebusy': 'period',
        'transp': 'text',
        // Time Zone Component Properties
        'tzid': 'text',
        'tzname': 'text',
        'tzoffsetfrom': 'utc-offset',
        'tzoffsetto': 'utc-offset',
        'tzurl': 'uri',
        // Relationship Component Properties
        'attendee': 'cal-address',
        'contact': 'text',
        'organizer': 'cal-address',
        'recurrence-id': 'date-time',
        'related-to': 'text',
        'url': 'uri',
        'uid': 'text',
        // Recurrence Component Properties
        'exdate': 'date-time-list',
        'exrule': 'recur',
        'rdate': 'date-time-list',
        'rrule': 'recur',
        // Alarm Component Properties
        'action': 'text',
        'repeat': 'integer',
        'trigger': 'duration',
        // Change Management Component Properties
        'created': 'date-time',
        'dtstamp': 'date-time',
        'last-modified': 'date-time',
        'sequence': 'integer',
        // Miscellaneous Component Properties
        'request-status': 'text',
        ////////////////////////////////////
        // parameter types (luckily there is no name overlap)
        'altrep': 'uri',
        'cn': 'text',
        'cutype': 'text',
        'delegated-from': 'cal-address',
        'delegated-to': 'cal-address',
        'dir': 'uri',
        'encoding': 'text',
        'fmttype': 'text',
        'fbtype': 'text',
        'language': 'text',
        'member': 'cal-address',
        'partstat': 'text',
        'range': 'text',
        'related': 'text',
        'reltype': 'text',
        'role': 'text',
        'rsvp': 'boolean',
        'sent-by': 'cal-address',
        'tzid': 'text',
        'value': 'text',
    })

    def for_property(self, name):
        """Returns a the default type for a property or parameter
        """
        return self[self.types_map.get(name, 'text')]

    def to_ical(self, name, value):
        """Encodes a named value from a primitive python type to an icalendar
        encoded string.
        """
        type_class = self.for_property(name)
        return type_class(value).to_ical()

    def from_ical(self, name, value):
        """Decodes a named property or parameter value from an icalendar
        encoded string to a primitive python type.
        """
        type_class = self.for_property(name)
        decoded = type_class.from_ical(value)
        return decoded
