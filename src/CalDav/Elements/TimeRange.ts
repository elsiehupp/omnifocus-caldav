import { BaseElement } from "./BaseElement"
import { toUtcDateString } from "../toUtcDateString"
import { NameSpace } from "../NameSpace"

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