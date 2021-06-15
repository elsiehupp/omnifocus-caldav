import { GetEtag } from "./GetEtag"

export class SynchronizableCalendarObjectCollection
{
    /*
    This class may hold a cached snapshot of a calendar, and changes
    in the calendar can easily be copied over through the sync method.

    To create a SynchronizableCalendarObjectCollection object, use
    calendar.objects(load_objects=true)
    */
    calendar:any;
    sync_token:any;
    objects:any;
    _objects_by_url:any;

    constructor(calendar, objects, sync_token)
    {
        this.calendar = calendar
        this.sync_token = sync_token
        this.objects = objects
        this._objects_by_url = null
    }

    __iter__()
    {
        return this.objects.__iter__()
    }

    objects_by_url()
    {
        /*
        returns a dict of the contents of the SynchronizableCalendarObjectCollection, URLs -> objects.
        */
        if (this._objects_by_url == null) {
            this._objects_by_url = {}
            for (let obj of this) {
                this._objects_by_url[obj.url] = obj
            }
        }
        return this._objects_by_url
    }

    sync()
    {
        /*
        This method will contact the caldav server,
        request all changes from it, and sync up the collection
        */
        var updated_objs = []
        var deleted_objs = []
        var updates = this.calendar.objects_by_sync_token(this.sync_token, load_objects=false)
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
        this.sync_token = updates.sync_token
        return [updated_objs, deleted_objs]
    }

}