/*This module contains the parser/generators (or coders/encoders if you
prefer) for the classes/datatypes that are used in iCalendar:

///////////////////////////////////////////////////////////////////////////
// This module defines these property value data types and property parameters

4.2 Defined property parameters are:

     ALTREP, CN, CUTYPE, DELEGATED-FROM, DELEGATED-TO, DIR, ENCODING, FMTTYPE,
     FBTYPE, LANGUAGE, MEMBER, PARTSTAT, RANGE, RELATED, RELTYPE, ROLE, RSVP,
     SENT-BY, TZID, VALUE

4.3 Defined value data types are:

    BINARY, BOOLEAN, CAL-ADDRESS, DATE, DATE-TIME, DURATION, FLOAT, INTEGER,
    PERIOD, RECUR, TEXT, TIME, URI, UTC-OFFSET

///////////////////////////////////////////////////////////////////////////

iCalendar properties have values. The values are strongly typed. This module
defines these types, calling val.to_ical() on them will render them as defined
in rfc2445.

If you pass any of these classes a Python primitive, you will have an object
that can render itself as iCalendar formatted date.

Property Value Data Types start with a 'v'. they all have an to_ical() and
from_ical() method. The to_ical() method generates a text string in the
iCalendar format. The from_ical() method can parse this format and return a
primitive Python datatype. So it should always be true that:

    x == vDataType.from_ical(VDataType(x).to_ical())

These types are mainly used for parsing and file generation. But you can set
them directly.
*/
// from datetime import date
// from datetime import datetime
// from datetime import time
// from datetime import timedelta
// from datetime import tzinfo

// try:
//     from dateutil.tz import tzutc
// except ImportError:
//     tzutc = None

// from icalendar import compat
// from icalendar.caselessdict import CaselessDict
// from icalendar.parser import Parameters
// from icalendar.parser import escape_char
// from icalendar.parser import tzid_from_dt
// from icalendar.parser import unescape_char
// from icalendar.parser_tools import DEFAULT_ENCODING
// from icalendar.parser_tools import SEQUENCE_TYPES
// from icalendar.parser_tools import to_unicode
// from icalendar.timezone_cache import _timezone_cache
// from icalendar.windows_to_olson import WINDOWS_TO_OLSON

// import base64
// import binascii
// import pytz
// import re
// import time as _time


DATE_PART = r'(\d+)D'
TIME_PART = r'T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
DATETIME_PART = '(?:%s)?(?:%s)?' % (DATE_PART, TIME_PART)
WEEKS_PART = r'(\d+)W'
DURATION_REGEX = re.compile(r'([-+]?)P(?:%s|%s)$'
                            % (WEEKS_PART, DATETIME_PART))
WEEKDAY_RULE = re.compile(r'(?P<signal>[+-]?)(?P<relative>[\d]?)'
                          r'(?P<weekday>[\w]{2})$')


////////////////////////////////////////////////////
// handy tzinfo classes you can use.
//

ZERO = timedelta(0)
HOUR = timedelta(hours=1)
STDOFFSET = timedelta(seconds=-_time.timezone)
if _time.daylight:
    DSTOFFSET = timedelta(seconds=-_time.altzone)
else:
    DSTOFFSET = STDOFFSET
DSTDIFF = DSTOFFSET - STDOFFSET

