import { BaseElement } from "./BaseElement"
import { NameSpace } from "../NameSpace"

export class NotDefined extends BaseElement
{
    tag:NameSpace = new NameSpace("C", "is-not-defined")
}