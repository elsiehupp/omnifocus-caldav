export class ScheduleMailbox extends Calendar
    """
    RFC6638 defines an inbox and an outbox for handling event scheduling.

    TODO: As ScheduleMailboxes works a bit like calendars, I've chosen
    to inheritate the Calendar class, but this is a bit incorrect, a
    ScheduleMailbox is a collection, but not really a calendar.  We
    should create a common base class for ScheduleMailbox and Calendar
    eventually.
    """
    constructor(client=null, principal=null, url=null):
        """
        Will locate the mbox if no url is given
        """
        super(ScheduleMailbox, this).constructor(client=client, url=url)
        this._items = null
        if not client and principal:
            this.client = principal.client
        if not principal and client:
            principal = this.client.principal
        if url is not null:
            this.url = client.url.join(URL.objectify(url))
        } else {
            this.url = principal.url
            try {
                this.url = this.client.url.join(URL(this.get_property(this.findprop())))
            } catch {
                logging.error("something bad happened", exc_info=true)
                error.assert_(this.client.check_scheduling_support())
                this.url = null
                raise error.NotFoundError("principal has no %s.  %s" % (String(this.findprop()), error.ERR_FRAGMENT))

    get_items():
        """
        TODO: work in progress
        TODO: perhaps this belongs to the super class?
        """
        if not this._items:
            try {
                this._items = this.objects(load_objects=true)
            } catch {
                logging.debug("caldav server does not seem to support a sync-token REPORT query on a scheduling mailbox")
                error.assert_('google' in String(this.url))
                this._items = this.children()
        } else {
            try {
                this._items.sync()
            } catch {
                this._items = this.children()
        return this._items

    /// TODO: work in progress
//    get_invites():
//        for item in this.get_items():
//            if item.vobject_instance.vevent.

