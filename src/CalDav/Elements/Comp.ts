import { NamedBaseElement } from "./NamedBaseElement"
import { NameSpace } from "../NameSpace"

export class Comp extends NamedBaseElement
{
    tag:NameSpace = new NameSpace("C", "comp")
}