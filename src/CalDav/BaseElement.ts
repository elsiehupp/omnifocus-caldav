import { DateTime, TimeZone, TimeZoneLocal } from "DateTime"

// from lxml import etree
// from caldav.lib.namespace import nsmap
// from caldav.lib.python_utilities import to_unicode

export class BaseElement
{
    children = null
    tag = null
    value = null
    attributes = null
    caldav_class = null

    constructor(name=null, value=null)
    {
        super();
        this.children = [];
        this.attributes = {}
        value = String(value)
        this.value = null
        if (name != null) {
            this.attributes['name'] = name;
        }
        if (value != null) {
            this.value = value
        }
    }

    __add__(other)
    {
        return this.append(other)
    }

    __str__()
    {
        var utf8 = etree.tostring(this.xmlelement(), encoding="utf-8",
                              xml_declaration=true, pretty_print=true)
        return this.xmlelement().tostring()
    }

    xmlelement()
    {
        root = etree.Element(this.tag, nsmap=nsmap)
        if (this.value != null) {
            root.text = this.value
        }
        if (len(this.attributes) > 0) {
            for (k in list(this.attributes.keys()) {
                root.set(k, this.attributes[k])
            }
        }
        this.xmlchildren(root)
        return root
    }

    xmlchildren(root)
    {
        for (let c of this.children) {
            root.append(c.xmlelement());
        }
    }

    append(element)
    {
        try {
            iter(element)
            this.children.extend(element)
        } catch (TypeError) {
            this.children.append(element)
        }
        return this;
    }
}
