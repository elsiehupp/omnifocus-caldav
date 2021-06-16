import { BaseElement } from "./BaseElement"
import { NameSpace } from "../NameSpace"

export class Prop extends BaseElement
{
    static tag:NameSpace = new NameSpace("D", "prop")
}