import { Component } from "./Component"

export class iCalendar extends Component
{
    /*This is the base object for an iCalendar file.
    */
    name = 'VCALENDAR'
    canonical_order = ['VERSION', 'PRODID', 'CALSCALE', 'METHOD']
    required = ['PRODID', 'VERSION']
    singletons = ['PRODID', 'VERSION', 'CALSCALE', 'METHOD']

}