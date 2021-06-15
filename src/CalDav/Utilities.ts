export function to_wire(text)
{
    if (text && text instanceof String) {
        text = bytes(text, 'utf-8')
    } else {
        text = to_unicode(text).encode('utf-8')
    }
    return text
}


export function to_local(text)
{
    if (text != null && !(text instanceof String)) {
        text = text.decode('utf-8')
    }
    return text
}


export function to_String(text)
{
    if (text && !(text instanceof String)) {
        text = text.decode('utf-8')
    }
    return text
}

export function to_normal_String(text)
{
    /*
    A str object is a unicode on python3 and a byte string on python2.
    Make sure we return a normal string, no matter what version of
    python ...
    */
    if (text != null && !(text instanceof String)) {
        text = text.decode('utf-8')
    }
    return text
}

export function to_unicode(text)
{
    if (text && (text instanceof String) &&
            !(text instanceof unicode)) {
        return unicode(text, 'utf-8')
    }
    if (text && (text instanceof bytes)) {
        return text.decode('utf-8')
    }
    return text
}
