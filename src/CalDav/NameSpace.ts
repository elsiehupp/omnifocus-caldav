// import { Dictionary } from "typescript-collections"

export class NameSpace
{
    public nsmap = {
        "D": "DAV:",
        "C": "urn:ietf:params:xml:ns:caldav",
    }

    /// silly thing with this one ... but quite many caldav libraries,
    /// caldav clients and caldav servers supports this namespace and the
    /// calendar-color and calendar-order properties.  However, those
    /// attributes aren't described anywhere, and the I-URL even gives a
    /// 404!  I don't want to ship it in the namespace list of every request.
    nsmap2 = Object.assign({}, this.nsmap, {"I": "http://apple.com/ns/ical/"})

    name:string;

    constructor (prefix, tag=null)
    {
        this.name = `{${this.nsmap2[prefix]}}`;
        if (tag != null) {
            this.name = `${name}${tag}`;
        }
    }

    toString()
    {
        return this.name;
    }

}
