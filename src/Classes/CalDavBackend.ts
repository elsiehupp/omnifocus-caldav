/*
Backend for storing/loading tasks in CalDAV Tasks
*/

import { DavClient } from "../CalDav/DavClient"
import { Dictionary } from "typescript-collections"
import { Calendar } from "../CalDav/Calendar"
import { Categories } from "./Categories"
import { Todo } from "../CalDav/Resources/Todo"
import { PeriodicImportBackend } from "./PeriodicImportBackend";
import { Task } from "../OmniFocusAPI/Task";
import { CHILDREN_FIELD, PARENT_FIELD, SEQUENCE, SORT_ORDER, Translator, UID_FIELD } from "./Translator"
import { TodoCache } from "./TodoCache";
import { Status } from "../OmniFocusAPI/Status";

/*
from dateutil.tz import UTC
from GTG.core.dates import LOCAL_TIMEZONE, Accuracy, Date
from GTG.core.interruptible import interruptible
from GTG.core.task import DisabledSyncCtx, Task
*/

const enableLogging: boolean = true;
// found elsewhere, should be factorized
// TAG_REGEX = RegExp.compile(r'\B@\w+[-_\w]*');
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
    dav_client:DavClient;
    cache: TodoCache;
    datetime: Date;
    translator: Translator;

    constructor(parameters)
    {
        super(parameters)
        /*
        See GenericBackend for an explanation of this function.
        Re-loads the saved state of the synchronization
        */
        for (var param in parameters) {
            this[param] = param;
        }
        this.dav_client = null;
        this.cache = new TodoCache();
        this.translator = new Translator();
    }

    initialize():void
    {
        this.initialize();
        this.dav_client = new DavClient(
            this.parameters['service-url'],
            this.parameters['username'],
            this.parameters['password']);
    }



    do_periodic_import():void
    {
        console.log("Running periodic import");
        var start = this.datetime.now();
        this.refreshCalendarListFromCalDav();
        // browsing calendars
        var counts = {'created': 0, 'updated': 0, 'unchanged': 0, 'deleted': 0};
        for (let cal_url, calendar of this.cache.calendars) {
            // retrieving todos and updating various cache
            console.log(`Fetching todos from ${cal_url}`);
            this.import_calendar_todos(calendar, start, counts);
        }
        if (enableLogging) {
            for (var key in counts) {
                if (counts[key]) {
                    console.log(`LOCAL ${key} ${counts[key]} tasks`);
                }
            }
        }
        this.parameters["is-first-run"] = false;
        this.cache.setInitialized(true);
    }

    setTask(task: Task):void
    {
        if (this.parameters["is-first-run"] || !this.cache.initialized) {
            console.log("not loaded yet, ignoring setTask");
            return;
        }
        console.log(`setTask todo for ${task.get_uuid()}`);
        // with (GTG.core.task.DisabledSyncCtx(task, sync_on_exit=false)) {
            var seq_value = SEQUENCE.get_gtg(task, this.namespace);
            SEQUENCE.write_gtg(task, seq_value + 1, this.namespace);
        // }
        var [todo, calendar] = this.getTodoAndCalendarFromCache(task);
        if (!calendar) {
            console.log(`${task} has no calendar to be synced with`);
            return;
        }
        if (todo && todo.taskParent.url != calendar.url) {  // switch calendar
            this.removeTodoFromCalDav(UID_FIELD.get_dav(todo), todo);
            this.createTodoOnCalDav(task, calendar);
        } else if (todo) {  // found one, saving it
            if (!this.translator.shouldSync(task, this.namespace, todo, null)) {
                console.log('insufficient change, ignoring setTask call');
                return;
            }
            // updating vtodo content
            this.translator.fillVTodo(task, calendar.name, this.namespace,
                                  todo.instance.vtodo);
            console.log(`SYNCING updating todo ${todo}`);
            try {
                todo.save();
            }
            catch (DavError) {
                console.log(`Something went wrong while updating ${task} => ${todo}`);
            }
        } else {  // creating from task
            this.createTodoOnCalDav(task, calendar);
        }
    }

    removeTodoFromCalDav2(tid: string):void
    {
        if (this.parameters["is-first-run"] || !this.cache.initialized) {
            console.log("not loaded yet, ignoring setTask");
            return;
        }
        if (!tid) {
            console.log("no task id passed to removeTodoFromCalDav2 call, ignoring");
            return;
        }
        var todo = this.cache.get_todo(tid);
        if (todo) {
            this.removeTodoFromCalDav(tid, todo);
        } else {
            console.log(`Could not find todo for task(${tid})`);
        }
    }

    //
    // Dav functions
    //

    createTodoOnCalDav(task: Task, calendar: Calendar)
    {
        console.log(`SYNCING creating todo for ${task}`);
        var newTodo = null;
        var newVTodo = this.translator.fillVTodo(
            task, calendar.name, this.namespace);
        try {
            newTodo = calendar.addTodo(newVTodo.serialize());
        } catch (DavError) {
            console.log(`Something went wrong while creating ${task} => ${newTodo}`);
            return;
        }
        var uid = UID_FIELD.get_dav(newTodo);
        this.cache.set_todo(newTodo, uid);
    }

    removeTodoFromCalDav(uid: string, todo: Todo):void
    {
        console.log(`SYNCING removing todo for Task(${uid})`);
        this.cache.del_todo(uid);  // cleaning cache
        try {  // deleting through caldav
            todo.delete();
        } catch (DavError) {
            console.log(`Something went wrong while deleting ${uid} => ${todo}`);
        }
    }

    refreshCalendarListFromCalDav()
    {
        /*Will browse calendar list available after principal call and cache
        them*/
        try {
            var principal = this.dav_client.principal();
        } catch {
            console.log("You need a correct login to CalDAV\n Configure CalDAV with login information. Error:");
        }
        for (var calendar in principal.calendars()) {
            this.cache.set_calendar(calendar);
        }
    }

    cleanTaskMissingFromBackend(uid: string,
                                         calendar_tasks: Set<Task>, counts: dict,
                                         import_started_on: datetime)
    {
        /*or a given UID will decide if (we remove it from GTG or ignore the
        fact that it's missing*/
        var task:Task = null;
        var do_delete:boolean = false;
        task = calendar_tasks[uid];
        if (import_started_on < task.get_added_date()) {
            return;
        }
        // if (first run, we're getting all task, including completed
        // if (we miss one, we delete it
        if (!this.cache.initialized) {
            do_delete = true;
        }
        // if (cache is initialized, it's normal we missed completed
        // task, but we should have seen active ones
        else if (task.taskStatus == Status.Active) {
            var [__, calendar] = this.getTodoAndCalendarFromCache(task);
            if (calendar) {
                console.log(`Couldn't find calendar for ${task}`);
                return;
            }
            try {  // fetching missing todo from server
                var todo = calendar.getTodoByUid(uid);
            } catch {
                do_delete = true;
            } finally {
                var result = this.update_task(task, todo, true);
                counts[result] += 1;
                return;
            }
        }
        if (do_delete) {  // the task was missing for a good reason
            counts['deleted'] += 1
            this.cache.del_todo(uid)
            this.request_task_deletion(uid)
        }
    }

    // @staticmethod
    denorm_children_on_vtodos(todos: Set<Task>)
    {
        // NOTE: GTG.core.task.Task.set_taskParent seems buggy so we can't use it
        // default caldav specs usually only specifies taskParent, here we use it
        // to mark all the children
        var childrenByParent = new Set<Task>();
        for (var todo in todos) {
            var taskParent = this.translator.getField(PARENT_FIELD).get_dav(todo);
            if (taskParent) {
                childrenByParent[taskParent[0]].append(todo);
            }
        }
        var todos_by_uid
        for (let todo of todos) {
            todos_by_uid = UID_FIELD.get_dav(todo)
        }
        for (let uid, children of childrenByParent.items()) {
            if (uid ! in todos_by_uid) {
                continue;
            }
            var vtodo = todos_by_uid[uid].instance.vtodo;
            children.sort(key=lambda v: string(SORT_ORDER.get_dav(v)) || '');
            CHILDREN_FIELD.write_dav(vtodo, [UID_FIELD.get_dav(child)
                                             for child in children]);
        }
    }

    import_calendar_todos(calendar: Calendar,
                               import_started_on: datetime, counts: Dictionary<K, V>)
    {
        var todos = calendar.todos(!this.cache.initialized);
        var todo_uids = {UID_FIELD.get_dav(todo) for todo in todos};

        // browsing all task linked to current calendar,
        // removing missed ones we don't see in fetched todos
        var calendar_tasks = new Dictionary(this.getCalendarTasks(calendar))
        for (var uid in set(calendar_tasks).difference(todo_uids)) {
            this.cleanTaskMissingFromBackend(uid, calendar_tasks, counts,
                                                  import_started_on)
        }

        this.denorm_children_on_vtodos(todos)

        for (let todo of this.sortTodos(todos)) {
            uid = UID_FIELD.get_dav(todo);
            this.cache.set_todo(todo, uid);
            // Updating and creating task according to todos
            var task = this.get_task(uid);
            if (!task) {  // not found, creating it
                task = this.task_factory(uid);
                this.translator.fillTask(todo, task, this.namespace);
                this.push_task(task);
                counts['created'] += 1;
            } else {
                var result = this.update_task(task, todo);
                counts[result] += 1;
            }
            if (__debug__) {
                if (Translator.shouldSync(task, this.namespace, todo)) {
                    console.log(`Shouldn't be diff for ${uid}`);
                }
            }
        }
    }

    update_task(task: Task, todo: Todo, force: bool = false)
    {
        if (!force) {
            var task_seq = SEQUENCE.get_gtg(task, this.namespace)
            var todo_seq = SEQUENCE.get_dav(todo)
            if (task_seq >= todo_seq) {
                return 'unchanged';
            }
        }
        this.translator.fillTask(todo, task, this.namespace);
        return 'updated';
    }

    sortTodos(todos: Set<Task>, max_depth: int = 500)
    {
        /*For a given list of todos, will return first the one without taskParent
        and then go deeper in the tree by browsing the tree.*/
        var loop = 0
        var known_todos = new Set<Task>()  // type: set
        while (known_todos.size < todos.size) {
            loop += 1;
            for (var todo in todos) {
                var uid = UID_FIELD.get_dav(todo);
                if (uid in known_todos) {
                    continue;
                }
                var taskParents = PARENT_FIELD.get_dav(todo);
                if (!taskParents  // no taskParent mean no relationship on build
                        || taskParents[0] in known_todos  // already known taskParent
                        || this.get_task(uid)) {  // already known uid
                    yield todo;
                    known_todos.add(uid);
                }
            }
            if (loop >= MAX_CALENDAR_DEPTH) {
                console.log(`Too deep, ${loop}th recursion isn't allowed`);
                break;
            }
        }
    }

    getCalendarTasks(calendar: Calendar)
    {
        /*Getting all tasks that has the calendar tag*/
        for (var uid in this.get_all_tasks()) {
            var task = this.get_task(uid);
            if (Categories.hasCalendarTag(task, calendar)) {
                yield uid, task;
            }
        }
    }

    //
    // Utility methods
    //

    getTodoAndCalendarFromCache(task: Task):[Task, Calendar]
    {
        /*For a given task, try to get the todo out of the cache and figures
        out its calendar if one is linked to it*/
        var todo = this.cache.get_todo(UID_FIELD.get_gtg(task));
        var calendar = null;
        // lookup by task
        for (var __, calendar in this.cache.calendars) {
            if (Categories.hasCalendarTag(task, calendar)) {
                console.log(`Found from task tag ${todo} and ${calendar}`);
                return [todo, calendar];
            }
        }
        var cname = task['calendar_name']; //namespace=this.namespace
        var curl = task["calendar_url"]; //namespace=this.namespace
        if (curl || cname) {
            calendar = this.cache.get_calendar(cname, curl)
            if (calendar) {
                console.log(`Found from task attr ${todo} and ${calendar}`);
                return [todo, calendar];
            }
        }
        if (todo && todo.taskParent) {
            console.log(`Found from todo ${todo} and ${todo.taskParent}`);
            return [todo, todo.taskParent];
        }
        return [null, null];
    }

    // @property
    namespace()
    {
        return `caldav:${this.parameters['service-url']}`
    }
}