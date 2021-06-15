import { ValuedBaseElement } from "./ValuedBaseElement"
import { NameSpace } from "./NameSpace"

export class CalendarDescription extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar-description")
}