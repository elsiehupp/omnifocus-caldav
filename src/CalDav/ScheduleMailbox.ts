import { Calendar } from "./Calendar"

export class ScheduleMailbox extends Calendar
{
    /*
    RFC6638 defines an inbox and an outbox for handling event scheduling.

    TODO: As ScheduleMailboxes works a bit like calendars, I've chosen
    to inheritate the Calendar class, but this is a bit incorrect, a
    ScheduleMailbox is a collection, but not really a calendar.  We
    should create a common base class for ScheduleMailbox and Calendar
    eventually.
    */
    items;

    constructor(client=null, principal=null, url=null)
    {
        /*
        Will locate the mbox if (no url is given
        */
        super(client, url)
        this.items = null
        if (!client && principal) {
            this.client = principal.client
        }
        if (!principal && client) {
            principal = this.client.principal
        }
        if (url != null) {
            this.url = client.url.join(URL.objectify(url))
        } else {
            this.url = principal.url
            try {
                this.url = this.client.url.join(URL(this.getProperty(this.findprop())))
            } catch (error) {
                console.log("something bad happened", exc_info=true)
                Assert(this.client.checkSchedulingSupport())
                this.url = null
                console.error(`principal has no ${String(this.findprop())}.  ${error}`)
                throw error;
            }
        }
    }

    get_items()
    {
        /*
        TODO: work in progress
        TODO: perhaps this belongs to the super class?
        */
        if (!this.items) {
            try {
                this.items = this.objects(loadObjects=true)
            } catch (error) {
                console.error("caldav server does not seem to support a sync-token REPORT query on a scheduling mailbox")
                console.error(error)
                Assert('google' in String(this.url))
                this.items = this.children()
            }
        } else {
            try {
                this.items.sync()
            } catch (error) {
                console.error(error)
                this.items = this.children()
            }
        }
        return this.items
    }
}

    /// TODO: work in progress
//    get_invites()
//        for item in this.get_items()
//            if (item.vobject_instance.vevent.

