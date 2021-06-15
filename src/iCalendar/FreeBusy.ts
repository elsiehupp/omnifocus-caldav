import { Component } from "./Component"

class FreeBusy extends Component
{

    name = 'VFREEBUSY'

    required = ['UID', 'DTSTAMP',]
    singletons = [
        'CONTACT', 'DTSTART', 'DTEND', 'DTSTAMP', 'ORGANIZER',
        'UID', 'URL',
    ]
    multiple = ['ATTENDEE', 'COMMENT', 'FREEBUSY', 'RSTATUS',]
}