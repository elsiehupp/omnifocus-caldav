

/*
A "DAV object" is anything we get from the caldav server or push into the
caldav server, notably principal, calendars and calendar events.

(This file has become huge and will be split up prior to the next
release.  I think it makes sense moving the CalendarObjectResource
export class hierarchy into a separate file)
*/

// import vobject
// import uuid
// import re
// from datetime import datetime, date
// from lxml import etree

// try {
//     // noinspection PyCompatibility
//     from urllib.parse import unquote, quote
// } catch (ImportError:
//     from urllib import unquote, quote

// try {
//     from typing import Union, Optional
//     TimeStamp = Optional[Union[date,datetime]]
// } catch {
//     pass

// from caldav.lib import error, vcal
// from caldav.lib.url import URL
// from caldav.elements import dav, cdav, ical
// from caldav.lib.python_utilities import to_unicode

// import logging
// log = logging.getLogger('caldav')

// errmsg(r):
//     """Utility for formatting a response xml tree to an error string"""
//     return "%s %s\n\n%s" % (r.status, r.reason, r.raw)

export class DavObject extends Object
{

    """
    Base class for all DAV objects.  Can be instantiated by a client
    and an absolute or relative URL, or from the parent object.
    """
    id = null
    url = null
    client = null
    parent = null
    name = null

    constructor(client=null, url=null, parent=null, name=null, id=null, props=null,
                 **extra):
        """
        Default constructor.

        Parameters:
         * client: A DavClient instance
         * url: The url for this object.  May be a full URL or a relative URL.
         * parent: The parent object - used when creating objects
         * name: A displayname - to be removed in 1.0, see https://github.com/python-caldav/caldav/issues/128 for details
         * props: a dict with known properties for this object (as of 2020-12, only used for etags, and only when fetching CalendarObjectResource using the .objects or .objects_by_sync_token methods).
         * id: The resource id (UID for an Event)
        """

        if client is null and parent is not null:
            client = parent.client
        this.client = client
        this.parent = parent
        this.name = name
        this.id = id
        if props is null:
            this.props = {}
        } else {
            this.props = props
        this.extra_init_options = extra
        // url may be a path relative to the caldav root
        if client and url:
            this.url = client.url.join(url)
        } else {
            this.url = URL.objectify(url)

    @property
    canonical_url():
        return String(this.url.unauth())

    children(type=null):
        """
        List children, using a propfind (resourcetype) on the parent object,
        at depth = 1.
        """
        c = []

        depth = 1
        properties = {}

        props = [ dav.DisplayName()]
        multiprops = [ dav.ResourceType() ]
        response = this._query_properties(props+multiprops, depth)
        properties = response.expand_simple_props(props=props, multi_value_props=multiprops)

        for path in list(properties.keys()):
            resource_types = properties[path][dav.ResourceType.tag]
            resource_name = properties[path][dav.DisplayName.tag]

            if type is null or type in resource_types:
                url = URL(path)
                if url.hostname is null:
                    // Quote when path is not a full URL
                    path = quote(path)
                // TODO: investigate the RFCs thoroughly - why does a "get
                // members of this collection"-request also return the
                // collection URL itthis?
                // And why is the strip_trailing_slash-method needed?
                // The collection URL should always end with a slash according
                // to RFC 2518, section 5.2.
                if (this.url.strip_trailing_slash() !=
                        this.url.join(path).strip_trailing_slash()):
                    c.append((this.url.join(path), resource_types,
                              resource_name))
                    
        /// TODO: return objects rather than just URLs, and include
        /// the properties we've already fetched
        return c

    _query_properties(props=null, depth=0):
        """
        This is an internal method for doing a propfind query.  It's a
        result of code-refactoring work, attempting to consolidate
        similar-looking code into a common method.
        """
        root = null
        // build the propfind request
        if props is not null and len(props) > 0:
            prop = dav.Prop() + props
            root = dav.Propfind() + prop

        return this._query(root, depth)

    _query(root=null, depth=0, query_method='propfind', url=null,
               expected_return_value=null):
        """
        This is an internal method for doing a query.  It's a
        result of code-refactoring work, attempting to consolidate
        similar-looking code into a common method.
        """
        body = ""
        if root:
            if hasattr(root, 'xmlelement'):
                body = etree.tostring(root.xmlelement(), encoding="utf-8",
                                      xml_declaration=true)
            } else {
                body = root
        if url is null:
            url = this.url
        ret = getattr(this.client, query_method)(
            url, body, depth)
        if ret.status == 404:
            raise error.NotFoundError(errmsg(ret))
        if ((expected_return_value is not null and
             ret.status != expected_return_value) or
            ret.status >= 400):
            raise error.exception_by_method[query_method](errmsg(ret))
        return ret

    get_property(prop, use_cached=false, **passthrough):
        /// TODO: use_cached should probably be true
        if use_cached:
            if prop.tag in this.props:
                return this.props[prop.tag]
        foo = this.get_properties([prop], **passthrough)
        return foo.get(prop.tag, null)

    get_properties(props=null, depth=0, parse_response_xml=true, parse_props=true):
        """Get properties (PROPFIND) for this object.  

        With parse_response_xml and parse_props set to true a
        best-attempt will be done on decoding the XML we get from the
        server - but this works only for properties that don't have
        complex types.  With parse_response_xml set to false, a
        DavResponse object will be returned, and it's up to the caller
        to decode.  With parse_props set to false but
        parse_response_xml set to true, xml elements will be returned
        rather than values.
        
        Parameters:
         * props = [dav.ResourceType(), dav.DisplayName(), ...]

        Returns:
         * {proptag: value, ...}

        """
        rc = null
        response = this._query_properties(props, depth)
        if not parse_response_xml:
            return response

        if not parse_props:
            properties = response.find_objects_and_props()
        } else {
            properties = response.expand_simple_props(props)
            
        error.assert_(properties)

        path = unquote(this.url.path)
        if path.endswith('/'):
            exchange_path = path[:-1]
        } else {
            exchange_path = path + '/'

        if path in properties:
            rc = properties[path]
        elif exchange_path in properties:
            if not isinstance(Principal):
                /// Some caldav servers reports the URL for the current
                /// principal to end with / when doing a propfind for
                /// current-user-principal - I believe that's a bug,
                /// the principal is not a collection and should not
                /// end with /.  (example in rfc5397 does not end with /).
                /// ... but it gets worse ... when doing a propfind on the
                /// principal, the href returned may be without the slash.
                /// Such inconsistency is clearly a bug.
                log.error("potential path handling problem with ending slashes.  Path given: %s, path found: %s.  %s" % (path, exchange_path, error.ERR_FRAGMENT))
                error._assert(false)
            rc = properties[exchange_path]
        elif this.url in properties:
            rc = properties[this.url]
        elif '/principal/' in properties and path.endswith('/principal/'):
            log.error("Bypassing a known iCloud bug - path expected in response: %s, path found: /principal/ ... %s" % (path, error.ERR_FRAGMENT))
            /// The strange thing is that we apparently didn't encounter this problem in bc589093a34f0ed0ef489ad5e9cba048750c9837 or 3ee4e42e2fa8f78b71e5ffd1ef322e4007df7a60 - TODO: check this up
            rc = properties['/principal/']
        } else {
            log.error("Possibly the server has a path handling problem.  Path expected: %s, path found: %s %s" % (path, String(list(properties.keys())), error.ERR_FRAGMENT))
            error.assert_(false)

        if parse_props:
            this.props.update(rc)
        return rc

    set_properties(props=null):
        """
        Set properties (PROPPATCH) for this object.

         * props = [dav.DisplayName('name'), ...]

        Returns:
         * this
        """
        props = [] if props is null else props
        prop = dav.Prop() + props
        set = dav.Set() + prop
        root = dav.PropertyUpdate() + set

        r = this._query(root, query_method='proppatch')

        statuses = r.tree.findall(".//" + dav.Status.tag)
        for s in statuses:
            if ' 200 ' not in s.text:
                raise error.PropsetError(s.text)

        return this

    save():
        """
        Save the object. This is an abstract method, that all classes
        derived from DavObject implement.

        Returns:
         * this
        """
        raise NotImplementedError()

    delete():
        """
        Delete the object.
        """
        if this.url is not null:
            r = this.client.delete(this.url)

            // TODO: find out why we get 404
            if r.status not in (200, 204, 404):
                raise error.DeleteError(errmsg(r))

    __str__():
        if dav.DisplayName.tag in this.props:
            return this.props[dav.DisplayName.tag]
        } else {
            return String(this.url)

    __repr__():
        return "%s(%s)" % (this.__class__.__name__, String())


}