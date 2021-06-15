import { BaseElement } from "./BaseElement"
import { NameSpace } from "./NameSpace"

export class ResourceType extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "resourcetype")
}