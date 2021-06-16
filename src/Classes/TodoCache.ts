export class TodoCache
{
    calendars_by_name: any;
    calendars_by_url: any;
    todos_by_uid: any;
    initialized: boolean;

    constructor()
    {
        this.calendars_by_name = {};
        this.calendars_by_url = {};
        this.todos_by_uid = {};
        this.setInitialized(false);
    }

    // @initialized.setter
    setInitialized(value)
    {
        if (!value) {
            console.error("ValueError: Can't uninitialize");
        }
        this.setInitialized(true);
    }

    get_calendar(name=null, url=null)
    {
        assert (name || url);
        if (name != null) {
            var calendar = this.calendars_by_name.get(name);
            if (calendar) {
                return calendar;
            }
        }
        if (url != null) {
            calendar = this.calendars_by_name.get(url);
            if (calendar) {
                return calendar;
            }
        }
        console.log(`no calendar for ${name} or ${url}`);
    }

    // @property
    calendars()
    {
        for (var url, calendar in this.calendars_by_url.items()) {
            yield url, calendar;
        }
    }

    set_calendar(calendar)
    {
        this.calendars_by_url[String(calendar.url)] = calendar;
        this.calendars_by_name[calendar.name] = calendar;
    }

    get_todo(uid)
    {
        return this.todos_by_uid.get(uid);
    }

    set_todo(todo, uid)
    {
        this.todos_by_uid[uid] = todo;
    }

    del_todo(uid)
    {
        this.todos_by_uid.pop(uid, null);
    }
}