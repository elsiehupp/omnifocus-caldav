import { BaseElement } from "./BaseElement"
import { NameSpace } from "../NameSpace"

// calendar resource type, see rfc4791, sec. 4.2
export class Calendar extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "calendar")
}