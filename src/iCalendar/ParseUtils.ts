
/*This module parses and generates contentlines as defined in RFC 2445
(iCalendar), but will probably work for other MIME types with similar syntax.
Eg. RFC 2426 (vCard)

It is stupid in the sense that it treats the content purely as strings. No type
conversion is attempted.
*/
// from __future__ import unicode_literals



export function escape_char(text):
    /*Format value according to iCalendar TEXT escaping rules.
    */
    assert isinstance(text, (compat.unicode_type, compat.bytes_type))
    // NOTE: ORDER MATTERS!
    return text.replace(r'\N', '\n')\
               .replace('\\', '\\\\')\
               .replace(';', r'\;')\
               .replace(',', r'\,')\
               .replace('\r\n', r'\n')\
               .replace('\n', r'\n')


export function unescape_char(text):
    assert isinstance(text, (compat.unicode_type, compat.bytes_type))
    // NOTE: ORDER MATTERS!
    if isinstance(text, compat.unicode_type):
        return text.replace('\\N', '\\n')\
                   .replace('\r\n', '\n')\
                   .replace('\\n', '\n')\
                   .replace('\\,', ',')\
                   .replace('\\;', ';')\
                   .replace('\\\\', '\\')
    elif isinstance(text, compat.bytes_type):
        return text.replace(b'\\N', b'\\n')\
                   .replace(b'\r\n', b'\n')\
                   .replace(b'\n', b'\n')\
                   .replace(b'\\,', b',')\
                   .replace(b'\\;', b';')\
                   .replace(b'\\\\', b'\\')


export function tzid_from_dt(dt):
    tzid = None
    if hasattr(dt.tzinfo, 'zone'):
        tzid = dt.tzinfo.zone  // pytz implementation
    elif hasattr(dt.tzinfo, 'tzname'):
        try:
            tzid = dt.tzinfo.tzname(dt)  // dateutil implementation
        except AttributeError:
            // No tzid available
            pass
    return tzid


export function foldline(line, limit=75, fold_sep='\r\n '):
    /*Make a string folded as defined in RFC5545
    Lines of text SHOULD NOT be longer than 75 octets, excluding the line
    break.  Long content lines SHOULD be split into a multiple line
    representations using a line "folding" technique.  That is, a long
    line can be split between any two characters by inserting a CRLF
    immediately followed by a single linear white-space character (i.e.,
    SPACE or HTAB).
    */
    assert isinstance(line, compat.unicode_type)
    assert '\n' not in line

    // Use a fast and simple variant for the common case that line is all ASCII.
    try:
        line.encode('ascii')
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    else:
        return fold_sep.join(
            line[i:i + limit - 1] for i in range(0, len(line), limit - 1)
        )

    ret_chars = []
    byte_count = 0
    for char in line:
        char_byte_len = len(char.encode(DEFAULT_ENCODING))
        byte_count += char_byte_len
        if byte_count >= limit:
            ret_chars.append(fold_sep)
            byte_count = char_byte_len
        ret_chars.append(char)

    return ''.join(ret_chars)


/////////////////////////////////////////////////////////////////
// Property parameter stuff

export function param_value(value):
    /*Returns a parameter value.
    */
    if isinstance(value, SEQUENCE_TYPES):
        return q_join(value)
    return dquote(value)


// Could be improved

// [\w-] because of the iCalendar RFC
// . because of the vCard RFC
const NAME = RegExp.compile(r'[\w.-]+')

const UNSAFE_CHAR = RegExp.compile('[\x00-\x08\x0a-\x1f\x7F",:;]')
const QUNSAFE_CHAR = RegExp.compile('[\x00-\x08\x0a-\x1f\x7F"]')
const FOLD = RegExp.compile(b'(\r?\n)+[ \t]')
const uFOLD = RegExp.compile('(\r?\n)+[ \t]')
const NEWLINE = RegExp.compile(r'\r?\n')


export function validate_token(name):
    match = NAME.findall(name)
    if len(match) == 1 and name == match[0]:
        return
    raise ValueError(name)


export function validate_param_value(value, quoted=True):
    validator = QUNSAFE_CHAR if quoted else UNSAFE_CHAR
    if validator.findall(value):
        raise ValueError(value)


// chars presence of which in parameter value will be cause the value
// to be enclosed in double-quotes
const QUOTABLE = RegExp.compile("[,;: ’']")


export function dquote(val):
    /*Enclose parameter values containing [,;:] in double quotes.
    */
    // a double-quote character is forbidden to appear in a parameter value
    // so replace it with a single-quote character
    val = val.replace('"', "'")
    if QUOTABLE.search(val):
        return '"%s"' % val
    return val


// parsing helper
export function q_split(st, sep=',', maxsplit=-1):
    /*Splits a string on char, taking double (q)uotes into considderation.
    */
    if maxsplit == 0:
        return [st]

    result = []
    cursor = 0
    length = len(st)
    inquote = 0
    splits = 0
    for i in range(length):
        ch = st[i]
        if ch == '"':
            inquote = not inquote
        if not inquote and ch == sep:
            result.append(st[cursor:i])
            cursor = i + 1
            splits += 1
        if i + 1 == length or splits == maxsplit:
            result.append(st[cursor:])
            break
    return result


export function q_join(lst, sep=','):
    /*Joins a list on sep, quoting strings with QUOTABLE chars.
    */
    return sep.join(dquote(itm) for itm in lst)





export function escape_string(val):
    // '%{:02X}'.format(i)
    return val.replace(r'\,', '%2C').replace(r'\:', '%3A')\
              .replace(r'\;', '%3B').replace(r'\\', '%5C')


export function unescape_string(val):
    return val.replace('%2C', ',').replace('%3A', ':')\
              .replace('%3B', ';').replace('%5C', '\\')


export function unescape_list_or_string(val):
    if isinstance(val, list):
        return [unescape_string(s) for s in val]
    else:
        return unescape_string(val)

