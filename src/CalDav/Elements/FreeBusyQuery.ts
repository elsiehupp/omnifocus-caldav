import { BaseElement } from "./BaseElement"
import { NameSpace } from "../NameSpace"

export class FreeBusyQuery extends BaseElement
{
    static tag:NameSpace = new NameSpace("C", "free-busy-query")
}