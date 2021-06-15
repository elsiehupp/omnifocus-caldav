import { ValuedBaseElement } from "./ValuedBaseElement"
import { NameSpace } from "./NameSpace"

export class MaxAttendeesPerInstance extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "max-attendees-per-instance")
}