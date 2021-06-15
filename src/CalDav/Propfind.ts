import { BaseElement } from "./BaseElement"
import { NameSpace } from "./NameSpace"

export class Propfind extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "propfind")
}