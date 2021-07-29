import { Component } from "./Component"

export class iCalEvent extends Component
{

    name = 'VEVENT'

    canonical_order = [
        'SUMMARY', 'DTSTART', 'DTEND', 'DURATION', 'DTSTAMP',
        'UID', 'RECURRENCE-ID', 'SEQUENCE', 'RRULE', 'RDATE',
        'EXDATE',
    ]

    required = ['UID', 'DTSTAMP',]
    singletons = [
        'CLASS', 'CREATED', 'DESCRIPTION', 'DTSTART', 'GEO', 'LAST-MODIFIED',
        'LOCATION', 'ORGANIZER', 'PRIORITY', 'DTSTAMP', 'SEQUENCE', 'STATUS',
        'SUMMARY', 'TRANSP', 'URL', 'RECURRENCE-ID', 'DTEND', 'DURATION',
        'UID', 'CATEGORIES',
    ]
    exclusive = ['DTEND', 'DURATION',]
    multiple = [
        'ATTACH', 'ATTENDEE', 'COMMENT', 'CONTACT', 'EXDATE',
        'RSTATUS', 'RELATED', 'RESOURCES', 'RDATE', 'RRULE'
    ]
    ignore_exceptions = true
}