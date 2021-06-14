


export function to_wire(text) {
    if (text and isinstance(text, string_types) && PY3) {
        text = bytes(text, 'utf-8')
    } else if (!PY3) {
        text = to_unicode(text).encode('utf-8')
    return text
}


export function to_local(text) {
    if (text is not null && !isinstance(text, string_types)
{
        text = text.decode('utf-8')
    return text
}


export function to_String(text) {
    if (text && !isinstance(text, string_types)
{
        text = text.decode('utf-8')
    return text
}

export function to_normal_String(text)
{
    /*
    A str object is a unicode on python3 and a byte string on python2.
    Make sure we return a normal string, no matter what version of
    python ...
    */
    if (PY3 && text && !isinstance(text, str)
{
        text = text.decode('utf-8')
    } else if (!PY3 && text && !isinstance(text, str)
{
        text = text.encode('utf-8')
    return text
}

export function to_unicode(text)
{
    if ((text && isinstance(text, string_types) && !PY3 and
            not isinstance(text, unicode))
{
        return unicode(text, 'utf-8')
    if ((PY3 && text && isinstance(text, bytes))
{
        return text.decode('utf-8')
    return text
}
