import { Component } from "./Component"

export class Journal extends Component
{

    name = 'VJOURNAL'

    required = ['UID', 'DTSTAMP',]
    singletons = [
        'CLASS', 'CREATED', 'DTSTART', 'DTSTAMP', 'LAST-MODIFIED', 'ORGANIZER',
        'RECURRENCE-ID', 'SEQUENCE', 'STATUS', 'SUMMARY', 'UID', 'URL',
    ]
    multiple = [
        'ATTACH', 'ATTENDEE', 'CATEGORIES', 'COMMENT', 'CONTACT', 'EXDATE',
        'RELATED', 'RDATE', 'RRULE', 'RSTATUS', 'DESCRIPTION',
    ]
}