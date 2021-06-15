import { BaseElement } from "./BaseElement"
import { NameSpace } from "./NameSpace"

export class PropertyUpdate extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "propertyupdate")
}