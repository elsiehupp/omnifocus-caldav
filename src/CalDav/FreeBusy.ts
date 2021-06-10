export class FreeBusy extends CalendarObjectResource
    """
    The `FreeBusy` object is used to represent a freebusy response from
    the server.  constructor is overridden, as a FreeBusy response has no
    URL or ID.  The inheritated methods .save and .load is moot and
    will probably throw errors (perhaps the class hierarchy should be
    rethought, to prevent the FreeBusy from inheritating moot methods)

    Update: With RFC6638 a freebusy object can have an URL and an ID.
    """
    constructor(parent, data, url=null, id=null):
        CalendarObjectResource.constructor(client=parent.client, url=url,
                                        data=data, parent=parent, id=id)

