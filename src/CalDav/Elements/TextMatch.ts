import { ValuedBaseElement } from "./ValuedBaseElement"
import { NameSpace } from "../NameSpace"

export class TextMatch extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("C", "text-match")

    constructor(value, collation="i;octet", negate=false)
    {
        super(value)
        this.attributes['collation'] = collation
        if (negate) {
            this.attributes['negate-condition'] = "yes"
        }
    }
}