import { BaseElement } from "./BaseElement"
import { NameSpace } from "./NameSpace"

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