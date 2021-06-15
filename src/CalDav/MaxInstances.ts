import { ValuedBaseElement } from "./ValuedBaseElement"
import { NameSpace } from "./NameSpace"

export class MaxInstances extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "max-instances")
}