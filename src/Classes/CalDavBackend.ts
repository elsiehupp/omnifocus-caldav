/*
Backend for storing/loading tasks in CalDAV Tasks
*/

import { CalDav } from "./CalDav"
import { iCalendar } from "./iCalendar"
import { PeriodicImportBackend } from "./PeriodicImportBackend";
import { Task } from "./OmniFocusAPI/omnifocus";
import { Translator } from "./Translator"
import { TodoCache } from "./TodoCache";
import { UID_FIELD } from "./UID_FIELD"

/*
from collections import defaultdict
from datetime import date, datetime
from hashlib import md5

import caldav
from dateutil.tz import UTC
from GTG.backends.backend_signals import BackendSignals
from GTG.backends.generic_backend import GenericBackend
from GTG.backends.periodic_import_backend import PeriodicImportBackend
from GTG.core.dates import LOCAL_TIMEZONE, Accuracy, Date
from GTG.core.interruptible import interruptible
from GTG.core.task import DisabledSyncCtx, Task
from vobject import iCalendar
*/

const enableLogging: boolean = true;
// found elsewhere, should be factorized
// TAG_REGEX = re.compile(r'\B@\w+[-_\w]*');
const MAX_CALENDAR_DEPTH = 500;
export const DAV_TAG_PREFIX = 'DAV_';

// Set of fields whose change alone won't trigger a sync up
export const DAV_IGNORE = ['last-modified',  // often updated alone by GTG
              'sequence',  // internal DAV value, only set by translator
              'percent-complete',  // calculated on subtask and status
              'completed',  // GTG date is constringained
                ];

export class CalDavDackend extends PeriodicImportBackend
{
    /*
    CalDAV backend
    */

    // BACKEND_ICON: string = "";

    // _general_description = [
    //     this.BACKEND_NAME = 'backend_caldav',
    //     this.BACKEND_ICON = 'applications-internet',
    //     this.BACKEND_HUMAN_NAME = _('CalDAV tasks'),
    //     this.BACKEND_AUTHORS = ['Mildred Ki\'Lya',
    //                                      'François Schmidts'],
    //     this.BACKEND_TYPE = this.TYPE_READWRITE,
    //     this.BACKEND_DESCRIPTION =
    //     'Lets you synchronize your GTG tasks with CalDAV tasks',
    // ];

    // _static_parameters = [
    //     "period": {
    //         this.PARAM_TYPE = this.TYPE_INT,
    //         this.PARAM_DEFAULT_VALUE = 15},
    //     "username": {
    //         this.PARAM_TYPE = this.TYPE_STRING,
    //         this.PARAM_DEFAULT_VALUE = 'insert your username'},
    //     "password": {
    //         this.PARAM_TYPE = this.TYPE_PASSWORD,
    //         this.PARAM_DEFAULT_VALUE = ''},
    //     "service-url": {
    //         this.PARAM_TYPE = this.TYPE_STRING,
    //         this.PARAM_DEFAULT_VALUE = 'https://example.com/webdav/'},
    //     "is-first-run": {
    //         this.PARAM_TYPE = this.TYPE_BOOL,
    //         this.PARAM_DEFAULT_VALUE = true},
    // ];

    _dav_client;
    _cache: TodoCache;


    //
    // Backend standard methods
    //

    constructor(parameters)
    {
        super(parameters)
        /*
        See GenericBackend for an explanation of this function.
        Re-loads the saved state of the synchronization
        */
        __init__(parameters);
        this._dav_client = null;
        this._cache = new TodoCache();
    }

    initialize():void
    {
        this.initialize();
        this._dav_client = CalDav.DAVClient(
            this._parameters['service-url'],
            this._parameters['username'],
            this._parameters['password']);
        }

    // @interruptible
    do_periodic_import():void
    {
        with (this.datastore.get_backend_mutex()) {
            this._do_periodic_import();
        }
    }

    // @interruptible
    set_task(task: Task):void
    {
        if (this._parameters["is-first-run"] || !this._cache.initialized) {
            console.log("not loaded yet, ignoring set_task");
            return;
        }
        with (this.datastore.get_backend_mutex()) {
            return this._set_task(task);
        }
    }

    // @interruptible
    remove_task(tid: string):void
    {
        if (this._parameters["is-first-run"] || !this._cache.initialized) {
            console.log("not loaded yet, ignoring set_task");
            return;
        }
        if (!tid) {
            console.log("no task id passed to remove_task call, ignoring");
            return;
        }
        with (this.datastore.get_backend_mutex()) {
            return this._remove_task(tid);
        }
    }

    //
    // real main methods
    //

    datetime: Date;

    _do_periodic_import():void
    {
        console.log("Running periodic import");
        var start = this.datetime.now();
        this._refresh_calendar_list();
        // browsing calendars
        var counts = {'created': 0, 'updated': 0, 'unchanged': 0, 'deleted': 0};
        for (var cal_url, calendar in this._cache.calendars) {
            // retrieving todos and updating various cache
            console.log('Fetching todos from %r', cal_url);
            this._import_calendar_todos(calendar, start, counts);
        }
        if (enableLogging) {
            for (var key in counts) {
                if (counts[key]) {
                    console.log(`LOCAL ${key} ${counts[key]} tasks`);
                }
            }
        }
        this._parameters["is-first-run"] = false;
        this._cache.setInitialized(true);
    }

    _set_task(task: Task):void
    {
        console.log('set_task todo for %r', task.get_uuid());
        with (DisabledSyncCtx(task, sync_on_exit=false)) {
            var seq_value = SEQUENCE.get_gtg(task, this.namespace);
            SEQUENCE.write_gtg(task, seq_value + 1, this.namespace);
        }
        var todo, calendar = this._get_todo_and_calendar(task);
        if (!calendar) {
            console.log("%r has no calendar to be synced with", task);
            return;
        }
        if (todo && todo.parent.url != calendar.url) {  // switch calendar
            this._remove_todo(UID_FIELD.get_dav(todo), todo);
            this._create_todo(task, calendar);
        } else if (todo) {  // found one, saving it
            if (!Translator.should_sync(task, this.namespace, todo)) {
                console.log('insufficient change, ignoring set_task call');
                return;
            }
            // updating vtodo content
            Translator.fill_vtodo(task, calendar.name, this.namespace,
                                  todo.instance.vtodo);
            console.log('SYNCING updating todo %r', todo);
            try {
                todo.save();
            }
            catch (caldav.lib.error.DAVError) {
                console.log('Something went wrong while updating '
                                 '%r => %r', task, todo);
            }
        } else {  // creating from task
            this._create_todo(task, calendar);
        }
    }

    _remove_task(tid: string):void
    {
        var todo = this._cache.get_todo(tid);
        if (todo) {
            this._remove_todo(tid, todo);
        } else {
            console.log(`Could not find todo for task(%{tid})`);
        }
    }

    //
    // Dav functions
    //

    _create_todo(task: Task, calendar: iCalendar)
    {
        console.log(`SYNCING creating todo for ${task}`);
        var new_todo = null;
        var new_vtodo = Translator.fill_vtodo(
            task, calendar.name, this.namespace);
        try {
            new_todo = calendar.add_todo(new_vtodo.serialize());
        } catch (caldav.lib.error.DAVError) {
            console.log(`Something went wrong while creating ${task} => ${new_todo}`);
            return;
        }
        var uid = UID_FIELD.get_dav(todo=new_todo);
        this._cache.set_todo(new_todo, uid);
    }

    _remove_todo(uid: string, todo: iCalendar):void
    {
        console.log('SYNCING removing todo for Task(%s)', uid);
        this._cache.del_todo(uid);  // cleaning cache
        try {  // deleting through caldav
            todo.delete();
        } catch (caldav.lib.error.DAVError) {
            console.log('Something went wrong while deleting %r => %r',
                             uid , todo);
        }
    }

    _refresh_calendar_list()
    {
        /*Will browse calendar list available after principal call and cache
        them*/
        try {
            var principal = this._dav_client.principal();
        } catch (caldav.lib.error.AuthorizationError as error) {
            var message = _(
                "You need a correct login to CalDAV\n Configure CalDAV with login information. Error:"
            );
            BackendSignals().interaction_requested(
                this.get_id(), "%s %r" % (message, error),
                BackendSignals().INTERACTION_INFORM, "on_continue_clicked");
            raise error;
        }
        for (var calendar in principal.calendars()) {
            this._cache.set_calendar(calendar);
        }
    }

    _clean_task_missing_from_backend(uid: string,
                                         calendar_tasks: dict, counts: dict,
                                         import_started_on: datetime)
    {
        /*or a given UID will decide if we remove it from GTG or ignore the
        fact that it's missing*/
        var task, do_delete = null, false;
        task = calendar_tasks[uid];
        if (import_started_on < task.get_added_date()) {
            return;
        }
        // if first run, we're getting all task, including completed
        // if we miss one, we delete it
        if (!this._cache.initialized) {
            do_delete = true;
        }
        // if cache is initialized, it's normal we missed completed
        // task, but we should have seen active ones
        else if (task.get_status() == Task.STA_ACTIVE) {
            var __, calendar = this._get_todo_and_calendar(task);
            if (calendar) {
                console.log("Couldn't find calendar for %r", task);
                return;
            }
            try {  // fetching missing todo from server
                var todo = calendar.todo_by_uid(uid);
            } catch (caldav.lib.error.NotFoundError) {
                do_delete = true;
            } finally {
                var result = this._update_task(task, todo, force=true);
                counts[result] += 1;
                return;
            }
        }
        if (do_delete) {  // the task was missing for a good reason
            counts['deleted'] += 1
            this._cache.del_todo(uid)
            this.datastore.request_task_deletion(uid)
        }
    }

    // @staticmethod
    _denorm_children_on_vtodos(todos: list)
    {
        // NOTE: GTG.core.task.Task.set_parent seems buggy so we can't use it
        // default caldav specs usually only specifies parent, here we use it
        // to mark all the children
        var children_by_parent = defaultdict(list)
        for (var todo in todos) {
            parent = PARENT_FIELD.get_dav(todo);
            if (parent) {
                children_by_parent[parent[0]].append(todo);
            }
        }
        var todos_by_uid = {UID_FIELD.get_dav(todo): todo for todo in todos};
        for (var uid, children in children_by_parent.items()) {
            if (uid ! in todos_by_uid) {
                continue;
            }
            var vtodo = todos_by_uid[uid].instance.vtodo;
            children.sort(key=lambda v: string(SORT_ORDER.get_dav(v)) or '');
            CHILDREN_FIELD.write_dav(vtodo, [UID_FIELD.get_dav(child)
                                             for child in children]);
        }
    }

    _import_calendar_todos(calendar: iCalendar,
                               import_started_on: datetime, counts: dict)
    {
        var todos = calendar.todos(include_completed=not this._cache.initialized);
        var todo_uids = {UID_FIELD.get_dav(todo) for todo in todos};

        // browsing all task linked to current calendar,
        // removing missed ones we don't see in fetched todos
        var calendar_tasks = dict(this._get_calendar_tasks(calendar))
        for (var uid in set(calendar_tasks).difference(todo_uids)) {
            this._clean_task_missing_from_backend(uid, calendar_tasks, counts,
                                                  import_started_on)
        }

        this._denorm_children_on_vtodos(todos)

        for (var todo in this.__sort_todos(todos)) {
            uid = UID_FIELD.get_dav(todo);
            this._cache.set_todo(todo, uid);
            // Updating and creating task according to todos
            task = this.datastore.get_task(uid);
            if (!task) {  // not found, creating it
                task = this.datastore.task_factory(uid);
                Translator.fill_task(todo, task, this.namespace);
                this.datastore.push_task(task);
                counts['created'] += 1;
            } else {
                var result = this._update_task(task, todo);
                counts[result] += 1;
            }
            if (__debug__) {
                if (Translator.should_sync(task, this.namespace, todo)) {
                    console.log("Shouldn't be diff for %r", uid);
                }
            }
        }
    }

    _update_task(task: Task, todo: iCalendar, force: bool = false)
    {
        if (!force) {
            var task_seq = SEQUENCE.get_gtg(task, this.namespace)
            var todo_seq = SEQUENCE.get_dav(todo)
            if (task_seq >= todo_seq) {
                return 'unchanged';
            }
        }
        Translator.fill_task(todo, task, this.namespace);
        return 'updated';
    }

    __sort_todos(todos: list, max_depth: int = 500)
    {
        /*For a given list of todos, will return first the one without parent
        and then go deeper in the tree by browsing the tree.*/
        var loop = 0
        var known_todos = set()  // type: set
        while (len(known_todos) < len(todos)) {
            loop += 1;
            for (var todo in todos) {
                var uid = UID_FIELD.get_dav(todo);
                if (uid in known_todos) {
                    continue;
                }
                var parents = PARENT_FIELD.get_dav(todo);
                if (!parents  // no parent mean no relationship on build
                        || parents[0] in known_todos  // already known parent
                        || this.datastore.get_task(uid)) {  // already known uid
                    yield todo;
                    known_todos.add(uid);
                }
            }
            if (loop >= MAX_CALENDAR_DEPTH) {
                console.log("Too deep, %dth recursion isn't allowed", loop);
                break;
            }
        }
    }

    _get_calendar_tasks(calendar: iCalendar)
    {
        /*Getting all tasks that has the calendar tag*/
        for (var uid in this.datastore.get_all_tasks()) {
            task = this.datastore.get_task(uid);
            if (CATEGORIES.has_calendar_tag(task, calendar)) {
                yield uid, task;
            }
        }
    }

    //
    // Utility methods
    //

    _get_todo_and_calendar(task: Task)
    {
        /*For a given task, try to get the todo out of the cache and figures
        out its calendar if one is linked to it*/
        var todo, calendar = this._cache.get_todo(UID_FIELD.get_gtg(task)), null
        // lookup by task
        for (var __, calendar in this._cache.calendars) {
            if (CATEGORIES.has_calendar_tag(task, calendar)) {
                console.log('Found from task tag %r and %r',
                                todo, calendar);
                return [todo, calendar];
            }
        }
        var cname = task.get_attribute('calendar_name', namespace=this.namespace);
        var curl = task.get_attribute("calendar_url", namespace=this.namespace);
        if (curl || cname) {
            calendar = this._cache.get_calendar(name=cname, url=curl)
            if (calendar) {
                console.log('Found from task attr %r and %r', todo, calendar);
                return {todo, calendar};
            }
        }
        if (todo && getattr(todo, 'parent', null)) {
            console.log('Found from todo %r and %r', todo, todo.parent);
            return {todo, todo.parent};
        }
        return [null, null];
    }

    // @property
    namespace()
    {
        return "caldav:%s" % this._parameters['service-url']
    }
}