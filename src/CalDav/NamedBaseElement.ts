import { BaseElement } from "./BaseElement"

export class NamedBaseElement extends BaseElement
{
    constructor(name=null)
    {
        super(NamedBaseElement, this).constructor(name=name)
    }

    xmlelement()
    {
        if (this.attributes.get('name') == null) {
            raise Exception("name attribute must be defined")
        }
        return super(NamedBaseElement, this).xmlelement()
    }
}