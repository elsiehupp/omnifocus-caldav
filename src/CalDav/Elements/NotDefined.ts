import { BaseElement } from "./BaseElement"
import { NameSpace } from "../NameSpace"

export class NotDefined extends BaseElement
{
    static tag:NameSpace = new NameSpace("C", "is-not-defined")
}