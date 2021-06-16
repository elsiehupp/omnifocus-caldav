import { ParseResult, SplitResult } from ""

// from caldav.lib.python_utilities import to_unicode, to_normal_str
// if (PY3) {//     from urllib.parse import ParseResult, SplitResult, urlparse
// } else {
//     from urlparse import ParseResult, SplitResult
//     from urlparse import urlparse


export class Url
{
    /*
    This class is for wrapping URLs into objects.  It's used
    internally in the library, end users should not need to know
    anything about this class.  All methods that accept URLs can be
    fed either with an URL object, a string or an urlparse.ParsedURL
    object.

    Addresses may be one out of three) {
    1) a path relative to the DAV-root, i.e. "someuser/calendar" may
    refer to
    "http://my.davical-server.example.com/caldav.php/someuser/calendar".

    2) an absolute path, i.e. "/caldav.php/someuser/calendar"

    3) a fully qualified URL, i.e.
    "http://someuser:somepass@my.davical-server.example.com/caldav.php/someuser/calendar".
    Remark that hostname, port, user, pass is typically given when
    instantiating the DavClient object and cannot be overridden later.

    As of 2013-11, some methods in the caldav library expected strings
    and some expected urlParseResult objects, some expected
    fully qualified URLs and most expected absolute paths.  The purpose
    of this class is to ensure consistency and at the same time
    maintaining backward compatibility.  Basically, all methods should
    accept any kind of URL.

    */
    url_parsed:any;
    url_raw:any;

    constructor(url)
    {
        if (url instanceof ParseResult || url instanceof SplitResult) {
            this.url_parsed = url
            this.url_raw = null
        } else {
            this.url_raw = url
            this.url_parsed = null
        }
    }

    toBoolean()
    {
        if (this.url_raw || this.url_parsed) {
            return true;
        } else {
            return false
        }
    }

    _ne__(other)
    {
        return this != other
    }

    _eq__(other)
    {
        if (this.toString() == other.toString()) {
            return true
        }
        // The URLs could have insignificant differences
        var me = this.canonical()
        if (other.hasOwnProperty('canonical') {
            other = other.canonical()
        }
        return String(me) == String(other)
    }

    _hash__()
    {
        return hash(String())
    }

    // TODO: better naming?  Will return url if (url is already an URL
    // object, else will instantiate a new URL object
    // @classmethod
    objectify(url)
    {
        if (url == null) {
            return null
        }
        if (url instanceof Url) {
            return url
        } else {
            return new Url(url)
        }
    }

    // To deal with all kind of methods/properties in the ParseResult
    // class
    getOwnProperty(attr)
    {
        if (this.url_parsed == null) {
            this.url_parsed = urlparse(this.url_raw)
        }
        if (this.url_parsed.hasOwnProperty(attr)) {
            return this.url_parsed.getOwnProperty(attr)
        } else {
            return this._unicode__().getOwnProperty(attr)
        }
    }

    // returns the url in text format
    toString()
    {
        return to_normal_String(this._unicode__())
    }

    // returns the url in text format
    _unicode__()
    {
        if (this.url_raw == null) {
            this.url_raw = this.url_parsed.geturl()
        return to_unicode(this.url_raw)
    }

    _repr__()
    {
        return "URL(%s)" % toString()
    }

    strip_trailing_slash()
    {
        if (toString()[-1] == '/') {
            return URL.objectify(toString()[:-1])
        } else {
            return this
        }
    }

    is_auth()
    {
        return this.username != null
    }

    unauth()
    {
        if (!this.is_auth() {
            return this
        }
        return URL.objectify(ParseResult(
            this.scheme,
            '%s:%s' % (this.hostname,
                       this.port or {'https': 443, 'http': 80}[this.scheme]),
            this.path.replace('//', '/'), this.params, this.query,
            this.fragment))
    }

    canonical()
    {
        /*
        a canonical URL ... remove authentication details, make sure there
        are no double slashes, and to make sure the URL is always the same,
        run it through the urlparser
        */
        var url = this.unauth()

        // this is actually already done in the unauth method ...
        if ('//' in url.path) {
            raise NotImplementedError("remove the double slashes")
        }

        // This looks like a noop - but it may have the side effect
        // that urlparser be run (actually not - unauth ensures we
        // have an urlParseResult object)
        url.scheme

        // make sure to delete the string version
        url.url_raw = null

        return url
    }

    join(path)
    {
        /*
        assumes this object is the base URL or base path.  if (the path
        is relative, it should be appended to the base.  if (the path
        is absolute, it should be added to the connection details of
        this.  if (the path already contains connection details and the
        connection details differ from this, raise an error.
        */
        const pathAsString = String(path)
        if (!path || !pathAsString) {
            return this
        path = URL.objectify(path)
        if (
            (path.scheme && this.scheme && path.scheme != this.scheme) or
            (path.hostname && this.hostname and
             path.hostname != this.hostname) or
            (path.port && this.port && path.port != this.port)
        ) {
            raise ValueError("%s can't be joined with %s" % (path))
        }

        if (path.path[0] == '/') {
            ret_path = uc2utf8(path.path)
        } else {
            sep = "/"
            if (this.path.endsWith("/") {
                sep = ""
            }
            ret_path = "%s%s%s" % (this.path, sep, uc2utf8(path.path))
        }
        return new Url(ParseResult(
            this.scheme or path.scheme, this.netloc or path.netloc, ret_path,
            path.params, path.query, path.fragment))
    }
}


function make(url)
{
    /*Backward compatibility*/
    return Url.objectify(url)
}
