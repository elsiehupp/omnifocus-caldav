

const nsmap = {
    "D": "DAV:",
    "C": "urn:ietf:params:xml:ns:caldav",
}

/// silly thing with this one ... but quite many caldav libraries,
/// caldav clients and caldav servers supports this namespace and the
/// calendar-color and calendar-order properties.  However, those
/// attributes aren't described anywhere, and the I-URL even gives a
/// 404!  I don't want to ship it in the namespace list of every request.
const nsmap2 = nsmap.copy()
nsmap2["I"] = "http://apple.com/ns/ical/";

export class NameSpace
{
    constructor (prefix, tag=null)
    {
        var name = `{${nsmap2[prefix]}}`;
        if (tag != null) {
            name = `${name}${tag}`;
        }
        return name
    }
}
