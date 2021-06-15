import { MultiStatus } from "./Elements/MultiStatus"
import { Response } from "./Elements/Response"
import { Status } from "./Elements/Status"
import { Href } from "./Elements/Href"
import { Prop } from "./Elements/Prop"
import { PropStat } from "./Elements/PropStat"
import { SyncToken } from "./Elements/SyncToken"

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
    objects;
    schedule_tag;
    syncToken;

    constructor(response)
    {
        this.headers = response.headers
        console.log("response headers: " + String(this.headers))
        console.log("response status: " + String(this.status))

        /// OPTIMIZE TODO: if (content-type is text/xml, we could eventually do
        /// streaming into the etree library rather than first read the whole
        /// content into a string.  (the line below just needs to be moved to
        /// the relevant if-pronges below)
        this.raw = response.content
        if (this.headers.get('Content-Type', '').startsWith('text/xml') ||
            this.headers.get('Content-Type', '').startsWith('application/xml')) {
            try {
                content_length = int(this.headers['Content-Length'])
            } catch {
                content_length=-1
            }
            if (content_length == 0) {
                this.raw = ''
                this.tree = null
                console.log("No content delivered")
            } else {
                /// With response.raw we could be streaming the content, but it does not work because
                /// the stream often is compressed.  We could add uncompression on the fly, but not
                /// considered worth the effort as for now.
                /this.tree = etree.parse(response.raw, parser=etree.XMLParser(remove_blank_text=true))
                this.tree = etree.XML(this.raw, parser=etree.XMLParser(remove_blank_text=true))
                if (log.level <= logging.DEBUG) {
                    console.log(etree.tostring(this.tree, pretty_print=true))
                }
            }
        } else if (this.headers.get('Content-Type', '').startsWith('text/calendar') ||
              this.headers.get('Content-Type', '').startsWith('text/plain')) {
              /// text/plain is typically for errors, we shouldn't see it on 200/207 responses.
              /// TODO: may want to log an error if (it's text/plain and 200/207.
            /// Logic here was moved when refactoring
            // pass
        } else {
            /// probably content-type was not given, i.e. iCloud does not seem to include those
            if ('Content-Type' in this.headers) {
                console.log("unexpected content type from server: %s. %s" % (this.headers['Content-Type'], error.ERR_FRAGMENT))
            }
            try {
                this.tree = etree.XML(this.raw, parser=etree.XMLParser(remove_blank_text=true))
            } catch {
                // pass
            }
        }

        /// this if (will always be true as for now, see other comments on streaming.
        if (hasattr('_raw')) {
            console.log(this.raw)
            // ref https://github.com/python-caldav/caldav/issues/112 stray CRs may cause problems
            if (type(this.raw) == bytes) {
                this.raw = this.raw.replace(b'\r\n', b'\n')
            } else if (type(this.raw) == str) {
                this.raw = this.raw.replace('\r\n', '\n')
            }
        }
        this.status = response.status_code
        /// ref https://github.com/python-caldav/caldav/issues/81,
        /// incidents with a response without a reason has been
        /// observed
        try {
            this.reason = response.reason
        } catch (AttributeError) {
            this.reason = ''
        }
    }

    // @property
    raw()
    {
        /// TODO: this should not really be needed?
        if (!hasattr('_raw') {
            this.raw = etree.tostring(this.tree, pretty_print=true)
        }
        return this.raw
    }

    strip_to_multistatus()
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
        var tree = this.tree
        if (tree.tag == 'xml' && tree[0].tag == MultiStatus.tag) {
            return tree[0]
        }
        if (tree.tag == MultiStatus.tag) {
            return this.tree
        }
        return this.tree;
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
        if (!(' 200 ' in status) &&
            !(' 201 ' in status) &&
            !(' 207 ' in status) &&
            !(' 404 ' in status)) {
            raise error.ResponseError(status)
        }
    }

    parse_response(response)
    {
        /*
        One response should contain one or zero status children, one
        href tag and zero or more propstats.  Find them, assert there
        isn't more in the response and return those three fields
        */
        var status = null
        var href = null
        var propstats = []
        error.assert_(response.tag == Response.tag)
        for (let elem of response) {
            if (elem.tag == Status.tag) {
                error.assert_(!status)
                status = elem.text
                error.assert_(status)
                this.validate_status(status)
            } else if (elem.tag == Href.tag) {
                assert not href
                href = unquote(elem.text)
            } else if (elem.tag == PropStat.tag) {
                propstats.append(elem)
            } else {
                error.assert_(false)
            }
        }
        error.assert_(href)
        return [href, propstats, status]
    }

    getObjectsAndProperties()
    {
        /*Check the response from the server, check that it is on an expected format,
        find hrefs and props from it and check statuses delivered.

        The parsed data will be put into this.objects, a dict {href) {
        {proptag: prop_element}}.  Further parsing of the prop_element
        has to be done by the caller.

        this.syncToken will be populated if (found, this.objects will be populated.
        */
        this.objects = {}

        if ('Schedule-Tag' in this.headers) {
            this.schedule_tag = this.headers['Schedule-Tag']
        }

        var responses = this.strip_to_multistatus()
        for (let r of responses) {
            if (r.tag == SyncToken.tag) {
                this.syncToken = r.text
                continue
            }
            error.assert_(r.tag == Response.tag)

            (href, propstats, status) = this.parse_response(r)
            /// I would like to do this assert here ...
            // error.assert_(not href in this.objects)
            /// but then there was https://github.com/python-caldav/caldav/issues/136
            if (!(href in this.objects)) {
                this.objects[href] = {}
            }

            /// The properties may be delivered either in one
            /// propstat with multiple props or in multiple
            /// propstat
            for (let propstat of propstats) {
                var cnt = 0
                status = propstat.find(Status.tag)
                error.assert_(status != null)
                if (status != null) {
                    error.assert_(len(status) == 0)
                    cnt += 1
                    this.validate_status(status.text)
                    /// if (a prop was not found, ignore it
                    if (' 404 ' in status.text) {
                        continue
                    }
                }
                for (let prop of propstat.iterfind(Prop.tag) {
                    cnt += 1
                    for (let theprop of prop) {
                        this.objects[href][theprop.tag] = theprop
                    }
                }

                /// there shouldn't be any more elements } catch (for status and prop
                error.assert_(cnt == propstat.length)
            }
        }

        return this.objects
    }

    expand_simple_prop(proptag, props_found, multi_value_allowed=false, xpath=null)
    {
        var values = []
        if (proptag in props_found) {
            var prop_xml = props_found[proptag]
            error.assert_(!prop_xml.items())
            if (!xpath && prop_xml.length==0) {
                if (prop_xml.text) {
                    values.append(prop_xml.text)
                }
            } else {
                var _xpath = xpath if (xpath else ".//*"
                var leafs = prop_xml.findall(_xpath)
                values = []
                for (let leaf of leafs) {
                    error.assert_(not leaf.items())
                    if (leaf.text) {
                        values.append(leaf.text)
                    } else {
                        values.append(leaf.tag)
                    }
                }
            }
        }
        if (multi_value_allowed) {
            return values
        } else {
            if (!values) {
                return null
            }
            error.assert_(len(values)==1)
            return values[0]
        }
    }

    /// TODO: "expand" does not feel quite right.
    expandSimpleProperties(props=[], multi_value_props=[], xpath=null)
    {
        /*
        The getObjectsAndProperties() will stop at the xml element
        below the prop tag.  This method will expand those props into
        text.

        Executes getObjectsAndProperties if (!run already, then
        modifies and returns this.objects.
        */
        if (!hasattr('objects') {
            this.getObjectsAndProperties()
        }
        for (let href of this.objects) {
            var props_found = this.objects[href]
            for (let prop of props) {
                props_found[prop.tag] = this.expand_simple_prop(prop.tag, props_found, xpath=xpath)
            }
            for (let prop of multi_value_props) {
                props_found[prop.tag] = this.expand_simple_prop(prop.tag, props_found, xpath=xpath, true)
            }
        }
        return this.objects
    }
}
