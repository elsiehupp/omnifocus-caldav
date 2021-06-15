import { GetEtag } from "./Elements/GetEtag"

export class SynchronizableCalendarObjectCollection
{
    /*
    This class may hold a cached snapshot of a calendar, and changes
    in the calendar can easily be copied over through the sync method.

    To create a SynchronizableCalendarObjectCollection object, use
    calendar.objects(loadObjects=true)
    */
    calendar:any;
    syncToken:any;
    objects:any;
    objects_by_url:any;

    constructor(calendar, objects, syncToken)
    {
        this.calendar = calendar
        this.syncToken = syncToken
        this.objects = objects
        this.objects_by_url = null
    }

    _iter__()
    {
        return this.objects.__iter__()
    }

    objects_by_url()
    {
        /*
        returns a dict of the contents of the SynchronizableCalendarObjectCollection, URLs -> objects.
        */
        if (this.objects_by_url == null) {
            this.objects_by_url = {}
            for (let obj of this) {
                this.objects_by_url[obj.url] = obj
            }
        }
        return this.objects_by_url
    }

    sync()
    {
        /*
        This method will contact the caldav server,
        request all changes from it, and sync up the collection
        */
        var updated_objs = []
        var deleted_objs = []
        var updates = this.calendar.getObjectsBySyncToken(this.syncToken, loadObjects=false)
        var obu = this.objects_by_url()
        for (let obj of updates) {
            if (obj.url in obu && GetEtag.tag in obu[obj.url].props && GetEtag.tag in obj.props) {
                if (obu[obj.url].props[GetEtag.tag] == obj.props[GetEtag.tag]) {
                    continue
                }
            }
            obu[obj.url] = obj
            try {
                obj.load()
                updated_objs.append(obj)
            } catch (error.NotFoundError) {
                deleted_objs.append(obj)
                obu.pop(obj.url)
            }
        }

        this.objects = obu.values()
        this.syncToken = updates.syncToken
        return [updated_objs, deleted_objs]
    }

}