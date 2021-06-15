import { Component } from "./Component"

export class Todo extends Component
{

    name = 'VTODO'

    required = ['UID', 'DTSTAMP',]
    singletons = [
        'CLASS', 'COMPLETED', 'CREATED', 'DESCRIPTION', 'DTSTAMP', 'DTSTART',
        'GEO', 'LAST-MODIFIED', 'LOCATION', 'ORGANIZER', 'PERCENT-COMPLETE',
        'PRIORITY', 'RECURRENCE-ID', 'SEQUENCE', 'STATUS', 'SUMMARY', 'UID',
        'URL', 'DUE', 'DURATION',
    ]
    exclusive = ['DUE', 'DURATION',]
    multiple = [
        'ATTACH', 'ATTENDEE', 'CATEGORIES', 'COMMENT', 'CONTACT', 'EXDATE',
        'RSTATUS', 'RELATED', 'RESOURCES', 'RDATE', 'RRULE'
    ]
}