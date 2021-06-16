import { ValuedBaseElement } from "./ValuedBaseElement"
import { NameSpace } from "../NameSpace"

export class TextMatch extends ValuedBaseElement
{
    static tag:NameSpace = new NameSpace("C", "text-match")

    constructor(value, collation="i;octet", negate=false)
    {
        super(value)
        this.attributes['collation'] = collation
        if (negate) {
            this.attributes['negate-condition'] = "yes"
        }
    }
}