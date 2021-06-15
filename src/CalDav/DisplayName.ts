import { ValuedBaseElement } from "./ValuedBaseElement"
import { NameSpace } from "./NameSpace"

export class DisplayName extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("D", "displayname")
}