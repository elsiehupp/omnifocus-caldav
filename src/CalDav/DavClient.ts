export class DavClient
{
    /*
    Basic client for webdav, uses the requests lib; gives access to
    low-level operations towards the caldav server.

    Unless you have special needs, you should probably care most about
    the constructor (constructor), the principal method and the calendar method.
    */
    proxy = null
    url = null

    constructor(url, proxy=null, username=null, password=null,
                 auth=null, ssl_verify_cert=true, ssl_cert=null)
                 {
        /*
        Sets up a HTTPConnection object towards the server in the url.
        Parameters) {
         * url: A fully qualified url: `scheme://user:pass@hostname:port`
         * proxy: A string defining a proxy server: `hostname:port`
         * username and password should be passed as arguments or in the URL
         * auth and ssl_verify_cert is passed to requests.request.
         ** ssl_verify_cert can be the path of a CA-bundle or false.
        */

        this.session = requests.Session()

        log.debug("url: " + String(url))
        this.url = URL.objectify(url)

        // Prepare proxy info
        if (proxy is not null) {
            this.proxy = proxy
            // requests library expects the proxy url to have a scheme
            if (re.match('^.*://', proxy) == null) {
                this.proxy = this.url.scheme + '://' + proxy

            // add a port is one is not specified
            // TODO: this will break if (using basic auth and embedding
            // username:password in the proxy URL
            p = this.proxy.split(":")
            if (len(p) == 2) {
                this.proxy += ':8080'
            log.debug("init - proxy: %s" % (this.proxy))

        // Build global headers
        this.headers = {"User-Agent": "Mozilla/5.0",
                        "Content-Type": "text/xml",
                        "Accept": "text/xml, text/calendar"}
        if (this.url.username is not null) {
            username = unquote(this.url.username)
            password = unquote(this.url.password)

        this.username = username
        this.password = password
        this.auth = auth
        // TODO: it's possible to force through a specific auth method here,
        // but no test code for this.
        this.ssl_verify_cert = ssl_verify_cert
        this.ssl_cert = ssl_cert
        this.url = this.url.unauth()
        log.debug("this.url: " + String(url))

        this._principal = null
    }

    principal(*largs, **kwargs)
    {
        /*
        Convenience method, it gives a bit more object-oriented feel to
        write client.principal() than Principal(client).

        This method returns a :class:`caldav.Principal` object, with
        higher-level methods for dealing with the principals
        calendars.
        */
        if (!this._principal) {
            this._principal = Principal(client=this, *largs, **kwargs)
        return this._principal
    }

    calendar(kwargs)
    {
        /*Returns a calendar object.

        Typically, an URL should be given as a named parameter (url)

        No network traffic will be initiated by this method.

        if (you don't know the URL of the calendar, use
        client.principal().calendar(...) instead, or
        client.principal().calendars()
        */
        return Calendar(client=this, kwargs)
    }

    check_dav_support()
    {
        try {
            /// SOGo does not return the full capability list on the caldav
            /// root URL, and that's OK according to the RFC ... so apparently
            /// we need to do an extra step here to fetch the URL of some
            /// element that should come with caldav extras.
            /// Anyway, packing this into a try-} catch (in case it fails.
            response = this.optioNameSpace(this.principal().url)
        } catch {
            response = this.optioNameSpace(this.url)
        return response.headers.get('DAV', null)
    }

    check_cdav_support()
    {
        support_list = this.check_dav_support()
        return 'calendar-access' in support_list
    }

    check_scheduling_support()
    {
        support_list = this.check_dav_support()
        return 'calendar-auto-schedule' in support_list
    }

    propfind(url=null, props="", depth=0)
    {
        /*
        Send a propfind request.

        Parameters) {
         * url: url for the root of the propfind.
         * props = (xml request), properties we want
         * depth: maximum recursion depth

        Returns
         * DavResponse
        */
        return this.request(url or this.url, "PROPFIND", props,
                            {'Depth': String(depth)})
    }

    proppatch(url, body, dummy=null)
    {
        /*
        Send a proppatch request.

        Parameters) {
         * url: url for the root of the propfind.
         * body: XML propertyupdate request
         * dummy: compatibility parameter

        Returns
         * DavResponse
        */
        return this.request(url, "PROPPATCH", body)
    }

    report(url, query="", depth=0)
    {
        /*
        Send a report request.

        Parameters) {
         * url: url for the root of the propfind.
         * query: XML request
         * depth: maximum recursion depth

        Returns
         * DavResponse
        */
        return this.request(url, "REPORT", query,
                            {'Depth': String(depth), "Content-Type") {
                             "application/xml; charset=\"utf-8\""})
    }

    mkcol(url, body, dummy=null)
    {
        /*
        Send a MKCOL request.

        MKCOL is basically not used with caldav, one should use
        MKCALENDAR instead.  However, some calendar servers MAY allow
        "subcollections" to be made in a calendar, by using the MKCOL
        query.  As for 2020-05, this method is not exercised by test
        code or referenced anywhere else in the caldav library, it's
        included just for the sake of completeness.  And, perhaps this
        DAVClient class can be used for vCards and other WebDAV
        purposes.

        Parameters) {
         * url: url for the root of the mkcol
         * body: XML request
         * dummy: compatibility parameter

        Returns
         * DavResponse
        */
        return this.request(url, "MKCOL", body)
    }

    mkcalendar(url, body="", dummy=null)
    {
        /*
        Send a mkcalendar request.

        Parameters) {
         * url: url for the root of the mkcalendar
         * body: XML request
         * dummy: compatibility parameter

        Returns
         * DavResponse
        */
        return this.request(url, "MKCALENDAR", body)

    put(url, body, headers={})
    {
        /*
        Send a put request.
        */
        return this.request(url, "PUT", body, headers)
    }

    post(url, body, headers={})
    {
        /*
        Send a POST request.
        */
        return this.request(url, "POST", body, headers)
    }

    delete(url)
    {
        /*
        Send a delete request.
        */
        return this.request(url, "DELETE")
    }
 
    optioNameSpace(url)
    {
        return this.request(url, "OPTIONS")
    }

    request(url, method="GET", body="", headers={})
    {
        /*
        Actually sends the request
        */

        // objectify the url
        url = URL.objectify(url)

        proxies = null
        if (this.proxy is not null) {
            proxies = {url.scheme: this.proxy}
            log.debug("using proxy - %s" % (proxies))

        // ensure that url is a normal string
        url = String(url)

        combined_headers = dict(this.headers)
        combined_headers.update(headers)
        if (body == null or body == "" && "Content-Type" in combined_headers) {
            del combined_headers["Content-Type"]

        log.debug(
            "sending request - method={0}, url={1}, headers={2}\nbody:\n{3}"
            .format(method, url, combined_headers, to_normal_String(body)))
        auth = null
        if (this.auth == null && this.username is not null) {
            auth = requests.auth.HTTPDigestAuth(this.username, this.password)
        } else {
            auth = this.auth

        r = this.session.request(
            method, url, data=to_wire(body),
            headers=combined_headers, proxies=proxies, auth=auth,
            verify=this.ssl_verify_cert, cert=this.ssl_cert, stream=false) /// TODO: optimize with stream=true maybe
        log.debug("server responded with %i %s" % (r.status_code, r.reason))
        response = DavResponse(r)


        // if (server supports BasicAuth and not DigestAuth, let's try again) {
        if (response.status == 401 && this.auth == null && auth is not null) {
            auth = requests.auth.HTTPBasicAuth(this.username, this.password)
            r = this.session.request(method, url, data=to_wire(body),
                                 headers=combined_headers, proxies=proxies,
                                 auth=auth, verify=this.ssl_verify_cert, cert=this.ssl_cert)
            response = DavResponse(r)

        this.auth = auth

        // this is an error condition the application wants to know
        if (response.status == requests.codes.forbidden or \
                response.status == requests.codes.unauthorized) {
            ex = error.AuthorizationError()
            ex.url = url
            /// ref https://github.com/python-caldav/caldav/issues/81,
            /// incidents with a response without a reason has been
            /// observed
            try {
                ex.reason = response.reason
            } catch (AttributeError) {
                ex.reason = "null given"
            raise ex

        // let's save the auth object and remove the user/pass information
        if (!this.auth && auth) {
            this.auth = auth
            del this.username
            del this.password

        return response

    }
}
