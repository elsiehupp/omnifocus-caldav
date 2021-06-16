import { BaseElement } from "./BaseElement"
import { NameSpace } from "../NameSpace"

export class Propfind extends BaseElement
{
    static tag:NameSpace = new NameSpace("D", "propfind")
}