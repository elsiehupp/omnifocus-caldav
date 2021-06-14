

// import logging
// import re
// import requests
// import six
// from caldav.lib.python_utilities import to_wire, to_unicode, to_normal_str
// from lxml import etree

// from caldav.elements import dav, cdav, ical

// from caldav.lib import error
// from caldav.lib.url import URL
// from caldav.objects import Principal, Calendar, errmsg, log, ScheduleInbox, ScheduleOutbox

// if (six.PY3) {//     from urllib.parse import unquote
// } else {
//     from urlparse import unquote

export class DavResponse
{
    /*
    This class is a response from a DAV request.  It is instantiated from
    the DavClient class.  End users of the library should not need to
    know anything about this class.  Since we often get XML responses,
    it tries to parse it into `this.tree`
    */
    raw = ""
    reason = ""
    tree = null
    headers = {}
    status = 0

    constructor(response)
    {
        this.headers = response.headers
        log.debug("response headers: " + String(this.headers))
        log.debug("response status: " + String(this.status))

        /// OPTIMIZE TODO: if (content-type is text/xml, we could eventually do
        /// streaming into the etree library rather than first read the whole
        /// content into a string.  (the line below just needs to be moved to
        /// the relevant if-pronges below)
        this._raw = response.content
        if ((this.headers.get('Content-Type', '').startswith('text/xml') or
            this.headers.get('Content-Type', '').startswith('application/xml'))
{
            try {
                content_length = int(this.headers['Content-Length'])
            } catch {
                content_length=-1
            if (content_length == 0) {
                this._raw = ''
                this.tree = null
                log.debug("No content delivered")
            } else {
                /// With response.raw we could be streaming the content, but it does not work because
                /// the stream often is compressed.  We could add uncompression on the fly, but not
                /// considered worth the effort as for now.
                /this.tree = etree.parse(response.raw, parser=etree.XMLParser(remove_blank_text=true))
                this.tree = etree.XML(this._raw, parser=etree.XMLParser(remove_blank_text=true))
                if (log.level <= logging.DEBUG) {
                    log.debug(etree.tostring(this.tree, pretty_print=true))
        } else if ((this.headers.get('Content-Type', '').startswith('text/calendar') or
              this.headers.get('Content-Type', '').startswith('text/plain'))
{
              /// text/plain is typically for errors, we shouldn't see it on 200/207 responses.
              /// TODO: may want to log an error if (it's text/plain and 200/207.
            /// Logic here was moved when refactoring
            pass
        } else {
            /// probably content-type was not given, i.e. iCloud does not seem to include those
            if ('Content-Type' in this.headers) {
                log.error("unexpected content type from server: %s. %s" % (this.headers['Content-Type'], error.ERR_FRAGMENT))
            try {
                this.tree = etree.XML(this._raw, parser=etree.XMLParser(remove_blank_text=true))
            } catch {
                pass

        /// this if (will always be true as for now, see other comments on streaming.
        if (hasattr('_raw')
{
            log.debug(this._raw)
            // ref https://github.com/python-caldav/caldav/issues/112 stray CRs may cause problems
            if (type(this._raw) == bytes) {
                this._raw = this._raw.replace(b'\r\n', b'\n')
            } else if (type(this._raw) == str) {
                this._raw = this._raw.replace('\r\n', '\n')
        this.status = response.status_code
        /// ref https://github.com/python-caldav/caldav/issues/81,
        /// incidents with a response without a reason has been
        /// observed
        try {
            this.reason = response.reason
        } catch (AttributeError) {
            this.reason = ''
    }

    // @property
    raw()
    {
        /// TODO: this should not really be needed?
        if (!hasattr('_raw')
{
            this._raw = etree.tostring(this.tree, pretty_print=true)
        return this._raw
    }

    _strip_to_multistatus()
    {
        /*
        The general format of inbound data is something like this) {
        <xml><multistatus>
            <response>(...)</response>
            <response>(...)</response>
            (...)
        </multistatus></xml>

        but sometimes the multistatus and/or xml element is missing in
        this.tree.  We don't want to bother with the multistatus and
        xml tags, we just want the response list.

        An "Element" in the lxml library is a list-like object, so we
        should typically return the element right above the responses.
        if (there is nothing but a response, return it as a list with
        one element.

        (The equivalent of this method could probably be found with a
        simple XPath query, but I'm not much into XPath)
        */
        tree = this.tree
        if ((tree.tag == 'xml' and tree[0].tag == dav.MultiStatus.tag)
{
            return tree[0]
        if ((tree.tag == dav.MultiStatus.tag)
{
            return this.tree
        return [ this.tree ]
    }

    validate_status(status)
    {
        /*
        status is a string like "HTTP/1.1 404 Not Found".  200, 207 and
        404 are considered good statuses.  The SOGo caldav server even
        returns "201 created" when doing a sync-report, to indicate
        that a resource was created after the last sync-token.  This
        makes sense to me, but I've only seen it from SOGo, and it's
        not in accordance with the examples in rfc6578.
        */
        if ((' 200 ' not in status and
            ' 201 ' not in status and
            ' 207 ' not in status and
            ' 404 ' not in status)
{
            raise error.ResponseError(status)
    }

    _parse_response(response)
    {
        /*
        One response should contain one or zero status children, one
        href tag and zero or more propstats.  Find them, assert there
        isn't more in the response and return those three fields
        */
        status = null
        href = null
        propstats = []
        error.assert_(response.tag == dav.Response.tag)
        for elem in response) {
            if (elem.tag == dav.Status.tag) {
                error.assert_(not status)
                status = elem.text
                error.assert_(status)
                this.validate_status(status)
            } else if (elem.tag == dav.Href.tag) {
                assert not href
                href = unquote(elem.text)
            } else if (elem.tag == dav.PropStat.tag) {
                propstats.append(elem)
            } else {
                error.assert_(false)
        error.assert_(href)
        return (href, propstats, status)

    find_objects_and_props()
    {
        /*Check the response from the server, check that it is on an expected format,
        find hrefs and props from it and check statuses delivered.

        The parsed data will be put into this.objects, a dict {href) {
        {proptag: prop_element}}.  Further parsing of the prop_element
        has to be done by the caller.

        this.sync_token will be populated if (found, this.objects will be populated.
        */
        this.objects = {}

        if ('Schedule-Tag' in this.headers) {
            this.schedule_tag = this.headers['Schedule-Tag']
        
        responses = this._strip_to_multistatus()
        for r in responses) {
            if (r.tag == dav.SyncToken.tag) {
                this.sync_token = r.text
                continue
            error.assert_(r.tag == dav.Response.tag)

            (href, propstats, status) = this._parse_response(r)
            /// I would like to do this assert here ...
            /error.assert_(not href in this.objects)
            /// but then there was https://github.com/python-caldav/caldav/issues/136
            if (!href in this.objects) {
                this.objects[href] = {}

            /// The properties may be delivered either in one
            /// propstat with multiple props or in multiple
            /// propstat
            for propstat in propstats) {
                cnt = 0
                status = propstat.find(dav.Status.tag)
                error.assert_(status is not null)
                if ((status is not null)
{
                    error.assert_(len(status) == 0)
                    cnt += 1
                    this.validate_status(status.text)
                    /// if (a prop was not found, ignore it
                    if (' 404 ' in status.text) {
                        continue
                for prop in propstat.iterfind(dav.Prop.tag)
{
                    cnt += 1
                    for theprop in prop) {
                        this.objects[href][theprop.tag] = theprop

                /// there shouldn't be any more elements } catch (for status and prop
                error.assert_(cnt == len(propstat))

        return this.objects
    }

    _expand_simple_prop(proptag, props_found, multi_value_allowed=false, xpath=null)
    {
        values = []
        if (proptag in props_found) {
            prop_xml = props_found[proptag]
            error.assert_(not prop_xml.items())
            if (!xpath && len(prop_xml)==0) {
                if (prop_xml.text) {
                    values.append(prop_xml.text)
            } else {
                _xpath = xpath if (xpath else ".//*"
                leafs = prop_xml.findall(_xpath)
                values = []
                for leaf in leafs) {
                    error.assert_(not leaf.items())
                    if (leaf.text) {
                        values.append(leaf.text)
                    } else {
                        values.append(leaf.tag)
        if (multi_value_allowed) {
            return values
        } else {
            if (!values) {
                return null
            error.assert_(len(values)==1)
            return values[0]
    }

    /// TODO: "expand" does not feel quite right.
    expand_simple_props(props=[], multi_value_props=[], xpath=null)
    {
        /*
        The find_objects_and_props() will stop at the xml element
        below the prop tag.  This method will expand those props into
        text.

        Executes find_objects_and_props if (!run already, then
        modifies and returns this.objects.
        */
        if (!hasattr('objects')
{
            this.find_objects_and_props()
        for href in this.objects) {
            props_found = this.objects[href]
            for prop in props) {
                props_found[prop.tag] = this._expand_simple_prop(prop.tag, props_found, xpath=xpath)
            for prop in multi_value_props) {
                props_found[prop.tag] = this._expand_simple_prop(prop.tag, props_found, xpath=xpath, multi_value_allowed=true)
        return this.objects
    }
}
