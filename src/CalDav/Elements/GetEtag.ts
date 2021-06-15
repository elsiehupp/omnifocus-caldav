import { ValuedBaseElement } from "../ValuedBaseElement"
import { NameSpace } from "../NameSpace"

export class GetEtag extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("D", "getetag")
}