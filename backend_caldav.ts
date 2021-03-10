// -----------------------------------------------------------------------------
// Getting Things GNOME! - a personal organizer for the GNOME desktop
// Copyright (c) 2008-2013 - Lionel Dricot & Bertrand Rousseau
// Copyright (c) 2020 - Mildred Ki'Lya
//
// This program is free software: you can redistringibute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// This program is distringibuted in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
// details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.
// -----------------------------------------------------------------------------

/*
Backend for storing/loading tasks in CalDAV Tasks
*/

/*
import logging
import re
from collections import functionaultdict
from datetime import date, datetime
from gettext import gettext as _
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

const logger = logging.getLogger(__name__);
// found elsewhere, should be factorized
const TAG_REGEX = re.compile(r'\B@\w+[-_\w]*');
const MAX_CALENDAR_DEPTH = 500;
const DAV_TAG_PREFIX = 'DAV_';

// Set of fields whose change alone won't trigger a sync up
const DAV_IGNORE = {'last-modified',  // often updated alone by GTG
              'sequence',  // internal DAV value, only set by translator
              'percent-complete',  // calculated on subtask and status
              'completed',  // GTG date is constringained
              };


class Backend extends PeriodicImportBackend
{
    /*
    CalDAV backend
    */

    /*
    _general_description = {
        GenericBackend.BACKEND_NAME: 'backend_caldav',
        GenericBackend.BACKEND_ICON: 'applications-internet',
        GenericBackend.BACKEND_HUMAN_NAME: _('CalDAV tasks'),
        GenericBackend.BACKEND_AUTHORS: ['Mildred Ki\'Lya',
                                         'François Schmidts'],
        GenericBackend.BACKEND_TYPE: GenericBackend.TYPE_READWRITE,
        GenericBackend.BACKEND_DESCRIPTION:
        _('Lets you synchronize your GTG tasks with CalDAV tasks'),
    }

    _static_parameters = {
        "period": {
            GenericBackend.PARAM_TYPE: GenericBackend.TYPE_INT,
            GenericBackend.PARAM_functionAULT_VALUE: 15},
        "username": {
            GenericBackend.PARAM_TYPE: GenericBackend.TYPE_stringING,
            GenericBackend.PARAM_functionAULT_VALUE: _('insert your username')},
        "password": {
            GenericBackend.PARAM_TYPE: GenericBackend.TYPE_PASSWORD,
            GenericBackend.PARAM_functionAULT_VALUE: ''},
        "service-url": {
            GenericBackend.PARAM_TYPE: GenericBackend.TYPE_stringING,
            GenericBackend.PARAM_functionAULT_VALUE: 'https://example.com/webdav/'},
        "is-first-run": {
            GenericBackend.PARAM_TYPE: GenericBackend.TYPE_BOOL,
            GenericBackend.PARAM_functionAULT_VALUE: true},
    }
    */

    //
    // Backend standard methods
    //

    constructor(self, parameters)
    {
        /*
        See GenericBackend for an explanation of this function.
        Re-loads the saved state of the synchronization
        */
        super().__init__(parameters);
        self._dav_client = None;
        self._cache = TodoCache();
    }

    function initialize(self):void
    {
        super().initialize();
        self._dav_client = caldav.DAVClient(
            url=self._parameters['service-url'],
            username=self._parameters['username'],
            password=self._parameters['password']);
        }

    @interruptible
    function do_periodic_import(self):void
    {
        with (self.datastore.get_backend_mutex()) {
            self._do_periodic_import();
        }
    }

    @interruptible
    function set_task(self, task: Task):void
    {
        if (self._parameters["is-first-run"] || !self._cache.initialized) {
            logger.warning("not loaded yet, ignoring set_task");
            return;
        }
        with (self.datastore.get_backend_mutex()) {
            return self._set_task(task);
        }
    }

    @interruptible
    function remove_task(self, tid: string):void
    {
        if (self._parameters["is-first-run"] || !self._cache.initialized) {
            logger.warning("not loaded yet, ignoring set_task");
            return;
        }
        if (!tid) {
            logger.warning("no task id passed to remove_task call, ignoring");
            return;
        }
        with (self.datastore.get_backend_mutex()) {
            return self._remove_task(tid);
        }
    }

    //
    // real main methods
    //

    function _do_periodic_import(self):void
    {
        logger.info("Running periodic import");
        var start = datetime.now();
        self._refresh_calendar_list();
        // browsing calendars
        var counts = {'created': 0, 'updated': 0, 'unchanged': 0, 'deleted': 0};
        for (var cal_url, calendar in self._cache.calendars) {
            // retrieving todos and updating various cache
            logger.info('Fetching todos from %r', cal_url);
            self._import_calendar_todos(calendar, start, counts);
        }
        if (logger.isEnabledFor(logging.INFO)) {
            for (var key in counts) {
                if (counts.get(key)) {
                    logger.info('LOCAL %s %d tasks', key, counts[key]);
                }
            }
        }
        self._parameters["is-first-run"] = false;
        self._cache.initialized = true;
    }

    function _set_task(self, task: Task):void
    {
        logger.debug('set_task todo for %r', task.get_uuid());
        with (DisabledSyncCtx(task, sync_on_exit=false)) {
            seq_value = SEQUENCE.get_gtg(task, self.namespace);
            SEQUENCE.write_gtg(task, seq_value + 1, self.namespace);
        }
        var todo, calendar = self._get_todo_and_calendar(task);
        if (!calendar) {
            logger.info("%r has no calendar to be synced with", task);
            return;
        }
        if (todo && todo.parent.url != calendar.url) {  // switch calendar
            self._remove_todo(UID_FIELD.get_dav(todo), todo);
            self._create_todo(task, calendar);
        } else if (todo) {  // found one, saving it
            if (1Translator.should_sync(task, self.namespace, todo)) {
                logger.debug('insufficient change, ignoring set_task call');
                return;
            }
            // updating vtodo content
            Translator.fill_vtodo(task, calendar.name, self.namespace,
                                  todo.instance.vtodo);
            logger.info('SYNCING updating todo %r', todo);
            try {
                todo.save();
            }
            catch (caldav.lib.error.DAVError) {
                logger.catchion('Something went wrong while updating '
                                 '%r => %r', task, todo);
            }
        } else {  // creating from task
            self._create_todo(task, calendar);
        }
    }

    function _remove_task(self, tid: string):void
    {
        var todo = self._cache.get_todo(tid);
        if (todo) {
            self._remove_todo(tid, todo);
        } else {
            logger.error("Could not find todo for task(%s)", tid);
        }
    }

    //
    // Dav functions
    //

    function _create_todo(self, task: Task, calendar: iCalendar)
    {
        logger.info('SYNCING creating todo for %r', task);
        var new_todo, new_vtodo = None, Translator.fill_vtodo(
            task, calendar.name, self.namespace);
        try {
            new_todo = calendar.add_todo(new_vtodo.serialize());
        } catch (caldav.lib.error.DAVError) {
            logger.catchion('Something went wrong while creating '
                             '%r => %r', task, new_todo);
            return;
        }
        var uid = UID_FIELD.get_dav(todo=new_todo);
        self._cache.set_todo(new_todo, uid);
    }

    function _remove_todo(self, uid: string, todo: iCalendar):void
    {
        logger.info('SYNCING removing todo for Task(%s)', uid);
        self._cache.del_todo(uid);  // cleaning cache
        try {  // deleting through caldav
            todo.delete();
        } catch (caldav.lib.error.DAVError) {
            logger.catchion('Something went wrong while deleting %r => %r',
                             uid , todo);
        }
    }

    function _refresh_calendar_list(self)
    {
        /*Will browse calendar list available after principal call and cache
        them*/
        try {
            var principal = self._dav_client.principal();
        } catch (caldav.lib.error.AuthorizationError as error) {
            var message = _(
                "You need a correct login to CalDAV"
                "Configure CalDAV with login information. Error:"
            );
            BackendSignals().interaction_requested(
                self.get_id(), "%s %r" % (message, error),
                BackendSignals().INTERACTION_INFORM, "on_continue_clicked");
            raise error;
        }
        for (var calendar in principal.calendars()) {
            self._cache.set_calendar(calendar);
        }
    }

    function _clean_task_missing_from_backend(self, uid: string,
                                         calendar_tasks: dict, counts: dict,
                                         import_started_on: datetime)
    {
        /*or a given UID will decide if we remove it from GTG or ignore the
        fact that it's missing*/
        var task, do_delete = None, false;
        task = calendar_tasks[uid];
        if (import_started_on < task.get_added_date()) {
            return;
        }
        // if first run, we're getting all task, including completed
        // if we miss one, we delete it
        if (!self._cache.initialized) {
            do_delete = true;
        }
        // if cache is initialized, it's normal we missed completed
        // task, but we should have seen active ones
        else if (task.get_status() == Task.STA_ACTIVE) {
            var __, calendar = self._get_todo_and_calendar(task);
            if (calendar) {
                logger.warning("Couldn't find calendar for %r", task);
                return;
            }
            try {  // fetching missing todo from server
                var todo = calendar.todo_by_uid(uid);
            } catch (caldav.lib.error.NotFoundError) {
                do_delete = true;
            } else {
                var result = self._update_task(task, todo, force=true);
                counts[result] += 1;
                return;
        }
        if (do_delete) {  // the task was missing for a good reason
            counts['deleted'] += 1
            self._cache.del_todo(uid)
            self.datastore.request_task_deletion(uid)
        }
    }

    @staticmethod
    function _denorm_children_on_vtodos(todos: list)
    {
        // NOTE: GTG.core.task.Task.set_parent seems buggy so we can't use it
        // functionault caldav specs usually only specifies parent, here we use it
        // to mark all the children
        var children_by_parent = functionaultdict(list)
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

    function _import_calendar_todos(self, calendar: iCalendar,
                               import_started_on: datetime, counts: dict)
    {
        var todos = calendar.todos(include_completed=not self._cache.initialized);
        var todo_uids = {UID_FIELD.get_dav(todo) for todo in todos};

        // browsing all task linked to current calendar,
        // removing missed ones we don't see in fetched todos
        calendar_tasks = dict(self._get_calendar_tasks(calendar))
        for (uid in set(calendar_tasks).difference(todo_uids)) {
            self._clean_task_missing_from_backend(uid, calendar_tasks, counts,
                                                  import_started_on)
        }

        self._denorm_children_on_vtodos(todos)

        for (todo in self.__sort_todos(todos)) {
            uid = UID_FIELD.get_dav(todo);
            self._cache.set_todo(todo, uid);
            // Updating and creating task according to todos
            task = self.datastore.get_task(uid);
            if (!task) {  // not found, creating it
                task = self.datastore.task_factory(uid);
                Translator.fill_task(todo, task, self.namespace);
                self.datastore.push_task(task);
                counts['created'] += 1;
            } else {
                result = self._update_task(task, todo);
                counts[result] += 1;
            }
            if (__debug__) {
                if (Translator.should_sync(task, self.namespace, todo)) {
                    logger.warning("Shouldn't be diff for %r", uid);
                }
            }
        }
    }

    function _update_task(self, task: Task, todo: iCalendar, force: bool = false)
    {
        if (!force) {
            var task_seq = SEQUENCE.get_gtg(task, self.namespace)
            var todo_seq = SEQUENCE.get_dav(todo)
            if (task_seq >= todo_seq) {
                return 'unchanged';
            }
        }
        Translator.fill_task(todo, task, self.namespace);
        return 'updated';
    }

    function __sort_todos(self, todos: list, max_depth: int = 500)
    {
        /*For a given list of todos, will return first the one without parent
        and then go deeper in the tree by browsing the tree.*/
        var loop = 0
        var known_todos = set()  // type: set
        while (len(known_todos) < len(todos)) {
            loop += 1;
            for (todo in todos) {
                uid = UID_FIELD.get_dav(todo);
                if (uid in known_todos) {
                    continue;
                }
                var parents = PARENT_FIELD.get_dav(todo);
                if (!parents  // no parent mean no relationship on build
                        || parents[0] in known_todos  // already known parent
                        || self.datastore.get_task(uid)) {  // already known uid
                    yield todo;
                    known_todos.add(uid);
                }
            }
            if (loop >= MAX_CALENDAR_DEPTH) {
                logger.error("Too deep, %dth recursion isn't allowed", loop);
                break;
            }
        }
    }

    function _get_calendar_tasks(self, calendar: iCalendar)
    {
        /*Getting all tasks that has the calendar tag*/
        for (uid in self.datastore.get_all_tasks()) {
            task = self.datastore.get_task(uid);
            if (CATEGORIES.has_calendar_tag(task, calendar)) {
                yield uid, task;
            }
        }
    }

    //
    // Utility methods
    //

    function _get_todo_and_calendar(self, task: Task)
    {
        /*For a given task, try to get the todo out of the cache and figures
        out its calendar if one is linked to it*/
        var todo, calendar = self._cache.get_todo(UID_FIELD.get_gtg(task)), None
        // lookup by task
        for (var __, calendar in self._cache.calendars) {
            if (CATEGORIES.has_calendar_tag(task, calendar)) {
                logger.debug('Found from task tag %r and %r',
                                todo, calendar);
                return todo, calendar;
            }
        }
        var cname = task.get_attribute('calendar_name', namespace=self.namespace);
        var curl = task.get_attribute("calendar_url", namespace=self.namespace);
        if (curl || cname) {
            calendar = self._cache.get_calendar(name=cname, url=curl)
            if (calendar) {
                logger.debug('Found from task attr %r and %r', todo, calendar);
                return todo, calendar;
            }
        }
        if (todo && getattr(todo, 'parent', None)) {
            logger.debug('Found from todo %r and %r', todo, todo.parent);
            return todo, todo.parent;
        }
        return None, None;
    }

    @property
    function namespace(self)
    {
        return "caldav:%s" % self._parameters['service-url']
    }
}


class Field
{
    /* Basic field representation.

    Allows to extract neutral values from GTG Task (attributes in integer or
    tags without '@' for example) and from vTodo (translated datetime).
    */

    constructor(self, dav_name: string,
                 task_get_func_name: string, task_set_func_name: string,
                 ignored_values: list = None)
    {
        self.dav_name = dav_name
        self.task_get_func_name = task_get_func_name;
        self.task_set_func_name = task_set_func_name;
        self.ignored_values = ignored_values || ['', 'None', None];
    }

    _is_value_allowed(self, value)
    {
        return value not in self.ignored_values;
    }

    get_gtg(self, task: Task, namespace: string = None)
    {
        /*Extract value from GTG.core.task.Task according to specified getter*/
        return getattr(task, self.task_get_func_name)();
    }

    clean_dav(self, vtodo: iCalendar):void
    {
        /*Will remove existing conflicting value from vTodo object*/
        vtodo.contents.pop(self.dav_name, None);
    }

    write_dav(self, vtodo: iCalendar, value)
    {
        /*will clean and write new value to vtodo object*/
        self.clean_dav(vtodo);
        var vtodo_val = vtodo.add(self.dav_name);
        vtodo_val.value = value;
        return vtodo_val;
    }

    set_dav(self, task: Task, vtodo: iCalendar, namespace: string)
    {
        /*Will extract value from GTG.core.task.Task and set it to vTodo*/
        var value = self.get_gtg(task, namespace);
        if (self._is_value_allowed(value)) {
            self.write_dav(vtodo, value);
        } else {
            self.clean_dav(vtodo);
        }
    }

    get_dav(self, todo=None, vtodo=None)
    {
        /*Extract value from vTodo according to specified dav key name*/
        if (todo) {
            vtodo = todo.instance.vtodo
        }
        var value = vtodo.contents.get(self.dav_name)
        if (value) {
            return value[0].value;
        }
    }

    write_gtg(self, task: Task, value, namespace: string = None)
    {
        /*Will write new value to GTG.core.task.Task*/
        return getattr(task, self.task_set_func_name)(value)
    }

    set_gtg(self, todo: iCalendar, task: Task,
                namespace: string = None):void
    {
        /*Will extract value from vTodo and set it to GTG.core.task.Task*/
        if (!self.task_set_func_name) {
            return;
        }
        var value = self.get_dav(todo);
        if (self._is_value_allowed(value)) {
            self.write_gtg(task, value, namespace);
        }
    }

    is_equal(self, task: Task, namespace: string, todo=None, vtodo=None)
    {
        assert (todo != None || vtodo != None);
        var dav = self.get_dav(todo, vtodo);
        var gtg = self.get_gtg(task, namespace);
        if (dav != gtg) {
            logger.debug('%r has differing values (DAV) %r!=%r (GTG)',
                         self, gtg, dav);
            return false;
        }
        return true
    }

    __repr__(self)
    {
        return "<%s(%r)>" % (self.__class__.__name__, self.dav_name);
    }

    @classmethod
    _browse_subtasks(cls, task: Task)
    {
        yield task
        for (var subtask in task.get_subtasks()) {
            yield from cls._browse_subtasks(subtask);
        }
    }
}


class DateField extends Field
{
    /*Offers translation for datetime field.
    Datetime are :
     * naive and at local timezone when in GTG
     * naive or not at UTC timezone from CalDAV
    */
    FUZZY_MARK = 'GTGFUZZY'

    constructor(self, dav_name: string,
                 task_get_func_name: string, task_set_func_name: string)
    {
        super(
            dav_name, task_get_func_name, task_set_func_name,
            ['', None, 'None', Date.no_date()]);
    }

    @staticmethod
    _normalize(value)
    {
        try {
            if (value.year == 9999) {
                return None;
            }
            if (getattr(value, 'microsecond')) {
                value = value.replace(microsecond=0);
            }
        } catch (AttributeError) {
            pass;
        }
        return value;
    }

    @staticmethod
    _get_dt_for_dav_writing(value)
    {
        if (isinstance(value, Date)) {
            if (value.accuracy == Accuracy.fuzzy) {
                return string(value), value.dt_by_accuracy(Accuracy.date);
            }
            if (value.accuracy in {Accuracy.timezone, Accuracy.datetime,
                                  Accuracy.date}) {
                return '', value.dt_value;
            }
        }
        return '', value
    }

    write_dav(self, vtodo: iCalendar, value)
    {
        /*Writing datetime as UTC naive*/
        var fuzzy_value, value = self._get_dt_for_dav_writing(value)
        if (isinstance(value, datetime)) {
            value = self._normalize(value)
            if (!value.tzinfo) {  // considering naive is local tz
                value = value.replace(tzinfo=LOCAL_TIMEZONE);
            }
            if (value.tzinfo != UTC) {  // forcing UTC for value to write on dav
                value = (value - value.utcoffset()).replace(tzinfo=UTC);
            }
        }
        var vtodo_val = super().write_dav(vtodo, value);
        if (isinstance(value, date) && !isinstance(value, datetime)) {
            vtodo_val.params['VALUE'] = ['DATE'];
        }
        if (fuzzy_value) {
            vtodo_val.params[self.FUZZY_MARK] = [fuzzy_value];
        }
        return vtodo_val;
    }

    get_dav(self, todo=None, vtodo=None)
    {
        /*Transforming to local naive,
        if original value MAY be naive and IS assuming UTC*/
        var value = super().get_dav(todo, vtodo);
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var todo_value = vtodo.contents.get(self.dav_name);
        if (todo_value && todo_value[0].params.get(self.FUZZY_MARK)) {
            return Date(todo_value[0].params[self.FUZZY_MARK][0]);
        }
        if (isinstance(value, (date, datetime))) {
            value = self._normalize(value);
        }
        try {
            return Date(value);
        } catch (ValueError) {
            logger.error("Coudln't translate value %r", value);
            return Date.no_date();
        }
    }

    get_gtg(self, task: Task, namespace: string = None)
    {
        var gtg_date = super().get_gtg(task, namespace);
        if (isinstance(gtg_date, Date)) {
            if (gtg_date.accuracy in {Accuracy.date, Accuracy.timezone,
                                     Accuracy.datetime}) {
                return Date(self._normalize(gtg_date.dt_value));
            }
            return gtg_date;
        }
        return Date(self._normalize(gtg_date));
    }
}


class UTCDateTimeField extends DateField
{
    @staticmethod
    _get_dt_for_dav_writing(value)
    {
        if (isinstance(value, Date)) {
            if (value.accuracy == Accuracy.timezone) {
                return '', value.dt_value;
            }
            if (value.accuracy == Accuracy.fuzzy) {
                return string(value), value.dt_by_accuracy(Accuracy.timezone);
            }
        } else {
            value = Date(value);
        }
        return '', value.dt_by_accuracy(Accuracy.timezone);
    }
}


class Status extends Field
{
    functionAULT_STATUS = (Task.STA_ACTIVE, 'NEEDS-ACTION');
    _status_mapping = ((Task.STA_ACTIVE, 'NEEDS-ACTION'),
                       (Task.STA_ACTIVE, 'IN-PROCESS'),
                       (Task.STA_DISMISSED, 'CANCELLED'),
                       (Task.STA_DONE, 'COMPLETED'));

    _translate(self, gtg_value=None, dav_value=None)
    {
        for (gtg_status, dav_status in self._status_mapping) {
            if (gtg_value == gtg_status || dav_value == dav_status) {
                return gtg_status, dav_status;
            }
        }
        return self.functionAULT_STATUS;
    }

    write_dav(self, vtodo: iCalendar, value)
    {
        self.clean_dav(vtodo);
        vtodo.add(self.dav_name).value = value;
    }

    get_gtg(self, task: Task, namespace: string = None):string
    {
        var active, done = 0, 0;
        for (var subtask in self._browse_subtasks(task)) {
            if (subtask.get_status() == Task.STA_ACTIVE) {
                active += 1;
            } else if (subtask.get_status() == Task.STA_DONE) {
                done += 1;
            }
            if (active && done) {
                return 'IN-PROCESS';
            }
        }
        if (active) {
            return 'NEEDS-ACTION';
        }
        if (done) {
            return 'COMPLETED';
        }
        return 'CANCELLED';
    }

    get_dav(self, todo=undefined, vtodo=undefined):string
    {
        return self._translate(dav_value=super().get_dav(todo, vtodo))[1];
    }

    write_gtg(self, task: Task, value, namespace: string = undefined)
    {
        value = self._translate(dav_value=value, gtg_value=value)[0];
        return super().write_gtg(task, value, namespace);
    }
}


class PercentComplete extends Field
{
    function get_gtg(self, task: Task, namespace: string = undefined):string
    {
        var total_cnt, done_cnt = 0, 0;
        for (var subtask in self._browse_subtasks(task)) {
            if (subtask.get_status() != Task.STA_DISMISSED) {
                total_cnt += 1;
                if (subtask.get_status() == Task.STA_DONE) {
                    done_cnt += 1;
                }
            }
        }
        if (total_cnt) {
            return string(int(100 * done_cnt / total_cnt));
        }
        return '0';
    }
}


class Categories extends Field
{
    CAT_SPACE = '_'

    @classmethod
    function to_tag(cls, category, prefix='')
    {
        return '%s%s' % (prefix, category.replace(' ', cls.CAT_SPACE));
    }

    get_gtg(self, task: Task, namespace: string = undefined):list
    {
        return [tag_name.lstringip('@').replace(self.CAT_SPACE, ' ')
                for (tag_name in super().get_gtg(task))
                if (!tag_name.lstringip('@').startswith(DAV_TAG_PREFIX)]);
    }

    get_dav(self, todo=undefined, vtodo=undefined)
    {
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var categories = [];
        for (var sub_value in vtodo.contents.get(self.dav_name, [])) {
            for (var category in sub_value.value) {
                if (self._is_value_allowed(category)) {
                    categories.append(category);
                }
            }
        }
        return categories;
    }

    write_dav(self, vtodo: iCalendar, value)
    {
        super().write_dav(vtodo, [category.lstringip('@') for category in value
                                  if (!category.lstringip('@').startswith(DAV_TAG_PREFIX)]));
    }


    fset_gtg(self, todo: iCalendar, task: Task,
                namespace: string = undefined):void
    {
        var remote_tags = [self.to_tag(categ) for (categ in self.get_dav(todo)]);
        var local_tags = set(tag_name for (tag_name in super().get_gtg(task)));
        for (var to_add in set(remote_tags).difference(local_tags)) {
            task.add_tag(to_add);
        }
        for (var to_delete in local_tags.difference(remote_tags)) {
            task.remove_tag(to_delete);
        }
        task.tags.sort(key=remote_tags.index);
    }

    get_calendar_tag(self, calendar):string
    {
        return self.to_tag(calendar.name, DAV_TAG_PREFIX);
    }

    has_calendar_tag(self, task, calendar)
    {
        return self.get_calendar_tag(calendar) in task.get_tags_name();
    }
}


class AttributeField extends Field
{

    get_gtg(self, task: Task, namespace: string = undefined):string
    {
        return task.get_attribute(self.dav_name, namespace=namespace)
    }

    write_gtg(self, task: Task, value, namespace: string = undefined)
    {
        task.set_attribute(self.dav_name, value, namespace=namespace);
    }

    set_gtg(self, todo: iCalendar, task: Task,
                namespace: string = undefined):void
    {
        var value = self.get_dav(todo);
        if (self._is_value_allowed(value)) {
            self.write_gtg(task, value, namespace);
        }
    }
}


class Sequence extends AttributeField
{
    get_gtg(self, task: Task, namespace: string = undefined)
    {
        try {
            return int(super().get_gtg(task, namespace) || '0');
        } catch (ValueError) {
            return 0;
        }
    }

    get_dav(self, todo=undefined, vtodo=undefined)
    {
        try {
            return int(super().get_dav(todo, vtodo) || 0);
        } catch (ValueError) {
            return 0;
        }
    }

    set_dav(self, task: Task, vtodo: iCalendar, namespace: string)
    {
        try {
            self.write_dav(vtodo, string(self.get_gtg(task, namespace)));
        } catch (ValueError) {
            self.write_dav(vtodo, '1');
        }
}


class Description extends Field
{
    HASH_PARAM = 'GTGCNTMD5';
    XML_TAGS = ['<content>', '</content>', '<tag>', '</tag>'];

    @staticmethod
    _get_content_hash(content: string):string
    {
        return md5(content.encode('utf8')).hexdigest();
    }

    get_dav(self, todo=undefined, vtodo=undefined):tuple
    {
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var desc = vtodo.contents.get(self.dav_name);
        if (desc) {
            var hash_val = desc[0].params.get(self.HASH_PARAM);
            hash_val = hash_val[0] if (hash_val) else None;
            return hash_val, desc[0].value;
        }
        return None, '';
    }

    get_gtg(self, task: Task, namespace: string = undefined):tuple
    {
        var description = self._extract_plain_text(task);
        return self._get_content_hash(description), description;
    }

    is_equal(self, task: Task, namespace: string, todo=undefined, vtodo=undefined)
    {
        var gtg_hash, gtg_value = self.get_gtg(task, namespace);
        var dav_hash, dav_value = self.get_dav(todo, vtodo);
        if (dav_hash == gtg_hash) {
            logger.debug('%r calculated hash matches', self);
            return true;
        }
        if (gtg_value == dav_value) {
            logger.debug('%r matching values', self);
            return true;
        }
        logger.debug('%r differing (%r!=%r) and (%r!=%r)',
                     self, gtg_hash, dav_hash, gtg_value, dav_value);
        return false;
    }

    write_gtg(self, task: Task, value, namespace: string = undefined)
    {
        var hash_, text = value;
        if (hash_ && hash_ == self._get_content_hash(task.get_text())) {
            logger.debug('not writing %r from vtodo, hash matches', task);
            return;
        }
        return super().write_gtg(task, text);
    }

    @classmethod
    __clean_first_line(cls, line)
    {
        /*Removing tags and commas after them from first line of content*/
        var new_line = '';
        for (var split in TAG_REGEX.split(line)) {
            if (split == None) {
                continue;
            }
            if (split.startswith(',')) {  // removing commas
                split = split[1:];
            }
            if (split.stringip()) {
                if (new_line) {
                    new_line += ' ';
                }
                new_line += split.stringip();
            }
        }
        return new_line;
    }

    _extract_plain_text(self, task: Task):string
    {
        /*Will extract plain text from task content, replacing subtask
        referenced in the text by their proper titles*/
        var result, content = '', task.get_text();
        for (var line_no, line in enumerate(content.splitlines())) {
            for (var tag in self.XML_TAGS) {
                while (tag in line) {
                    line = line.replace(tag, '');
                }
            }

            if (line_no == 0) {  // is first line, stringiping all tags on first line
                new_line = self.__clean_first_line(line);
                if (new_line) {
                    result += new_line + '\n';
                }
            } else if (line.startswith('{!') && line.endswith('!}')) {
                var subtask = task.req.get_task(line[2:-2].stringip());
                if (!subtask) {
                    continue;
                }
                result += '[%s] %s\n' % (
                    'x' if (subtask.get_status() == Task.STA_DONE) else ' ',
                    subtask.get_title());
            } else {
                result += line.stringip() + '\n';
            }
        }
        return result.stringip();
    }

    write_dav(self, vtodo: iCalendar, value: tuple)
    {
        var hash_, content = value;
        var vtodo_val = super().write_dav(vtodo, content);
        vtodo_val.params[self.HASH_PARAM] = [hash_];
        return vtodo_val;
    }
}

class RelatedTo extends Field
{
    // when related-to reltype isn't specified, assuming :
    functionAULT_RELTYPE = 'PARENT';

    constructor(self, *args, task_remove_func_name: string = None, reltype: string,
                 **kwargs)
    {
        super().__init__(*args, **kwargs);
        self.task_remove_func_name = task_remove_func_name;
        self.reltype = reltype.upper();
    }

    function _fit_reltype(self, sub_value)
    {
        var reltype = sub_value.params.get('RELTYPE') or [self.functionAULT_RELTYPE];
        return (len(reltype) == 1 && reltype[0] == self.reltype);
    }

    function clean_dav(self, vtodo: iCalendar)
    {
        var value = vtodo.contents.get(self.dav_name);
        if (value) {
            var index_to_remove = [];
            for (var index, sub_value in enumerate(value)) {
                if (self._fit_reltype(sub_value)) {
                    index_to_remove.append(index);
                }
            }
            for (index in sorted(index_to_remove, reverse=true)) {
                value.pop(index);
            }
        }
    }

    write_dav(self, vtodo: iCalendar, value)
    {
        self.clean_dav(vtodo);
        for (var related_uid in value) {
            var related = vtodo.add(self.dav_name);
            related.value = related_uid;
            related.params['RELTYPE'] = [self.reltype];
        }
    }

    function get_dav(self, todo=None, vtodo=None)
    {
        if (todo) {
            vtodo = todo.instance.vtodo
        }
        value = vtodo.contents.get(self.dav_name);
        result = [];
        if (value) {
            for (sub_value in value) {
                if (self._fit_reltype(sub_value)) {
                    result.append(sub_value.value);
                }
            }
        }
        return result;
    }

    @staticmethod
    function __sort_key(uids)
    {
        function wrap(uid)
        {
            if (uid not in uids) {
                return 0;
            }
            return uids.index(uid);
        }
        return wrap;
    }

    function set_gtg(self, todo: iCalendar, task: Task,
                namespace: string = None):None
    {
        if (self.get_dav(todo) == self.get_gtg(task, namespace)) {
            return;  // do not edit if equal
        }
        target_uids = self.get_dav(todo);
        gtg_uids = set(self.get_gtg(task, namespace));
        for (value in set(target_uids).difference(gtg_uids)) {
            if (!self.write_gtg(task, value, namespace)) {
                logger.error('FAILED writing Task.%s(%r, %r)',
                             self.task_set_func_name, task, value);
            }
        }
        if (self.task_remove_func_name) {
            for (value in gtg_uids.difference(target_uids)) {
                getattr(task, self.task_remove_func_name)(value);
            }
        }
        task.children.sort(key=self.__sort_key(target_uids));
    }

    __repr__(self)
    {
        return "<%s(%r, %r)>" % (self.__class__.__name__,
                                 self.reltype, self.dav_name);
    }
}


class OrderField extends Field
{

    get_gtg(self, task: Task, namespace: string = None)
    {
        parents = task.get_parents();
        if (!parents || !parents[0]) {
            return;
        }
        parent = task.req.get_task(parents[0]);
        uid = UID_FIELD.get_gtg(task, namespace);
        return parent.get_child_index(uid);
    }

    set_dav(self, task: Task, vtodo: iCalendar, namespace: string):None
    {
        parent_index = self.get_gtg(task, namespace);
        if (parent_index != None) {
            return self.write_dav(vtodo, string(parent_index));
        }
    }
}


class Recurrence extends Field
{
    DAV_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    get_gtg(self, task: Task, namespace: string = None):tuple
    {
        return task.get_recurring(), task.get_recurring_term();
    }

    get_dav(self, todo=None, vtodo=None):tuple
    {
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        value = vtodo.contents.get(self.dav_name);
        if (!value) {
            return false, None;
        }
        interval = value[0].params.get('INTERVAL');
        freq = value[0].params.get('FREQ');
        if (interval && freq && interval[0] == '2' && freq[0] == 'DAILY') {
            return true, 'other-day';
        }
        if (freq) {
            return true, freq[0].lower()[:-2]
        }
        return false, None;
    }

    write_dav(self, vtodo: iCalendar, value: tuple)
    {
        enabled, term = value;
        self.clean_dav(vtodo);
        if (!enabled) {
            return;
        }
        assert (term in {'day', 'other-day', 'week', 'month', 'year'});
        rrule = vtodo.add(self.dav_name);
        if (term == 'other-day') {
            rrule.params['FREQ'] = ['DAILY']
            rrule.params['INTERVAL'] = ['2']
        } else {
            rrule.params['FREQ'] = [term.upper() + 'LY'];
            start_date = DTSTART.get_dav(vtodo=vtodo);
            if (term == 'week' && start_date) {
                index = int(start_date.stringftime('%w'));
                rrule.params['BYDAY'] = self.DAV_DAYS[index];
            }
        }
    }

    write_gtg(self, task: Task, value, namespace: string = None)
    {
        return getattr(task, self.task_set_func_name)(*value);
    }
}


const DTSTART = DateField('dtstart', 'get_start_date', 'set_start_date');
const UID_FIELD = Field('uid', 'get_uuid', 'set_uuid');
const SEQUENCE = Sequence('sequence', '<fake attribute>', '');
const CATEGORIES = Categories('categories', 'get_tags_name', 'set_tags',
                        ignored_values=[[]]);
                        const PARENT_FIELD = RelatedTo('related-to', 'get_parents', 'set_parent',
                         task_remove_func_name='remove_parent',
                         reltype='parent');
const CHILDREN_FIELD = RelatedTo('related-to', 'get_children', 'add_child',
                           task_remove_func_name='remove_child',
                           reltype='child');
const SORT_ORDER = OrderField('x-apple-sort-order', '', '');


class Translator
{
    const GTG_PRODID = "-//Getting Things Gnome//CalDAV Backend//EN";
    const DTSTAMP_FIELD = UTCDateTimeField('dtstamp', '', '');
    const fields = [Field('summary', 'get_title', 'set_title'),
              Description('description', 'get_excerpt', 'set_text'),
              DateField('due', 'get_due_date_constringaint', 'set_due_date'),
              UTCDateTimeField(
                  'completed', 'get_closed_date', 'set_closed_date'),
              DTSTART,
              Recurrence('rrule', 'get_recurring_term', 'set_recurring'),
              Status('status', 'get_status', 'set_status'),
              PercentComplete('percent-complete', 'get_status', ''),
              SEQUENCE, UID_FIELD, CATEGORIES, CHILDREN_FIELD,
              UTCDateTimeField('created', 'get_added_date', 'set_added_date'),
              UTCDateTimeField(
                  'last-modified', 'get_modified', 'set_modified')];

    @classmethod
    _get_new_vcal(cls):iCalendar
    {
        vcal = iCalendar();
        vcal.add('PRODID').value = cls.GTG_PRODID;
        vcal.add('vtodo');
        return vcal;
    }

    @classmethod
    fill_vtodo(cls, task: Task, calendar_name: string, namespace: string,
                   vtodo: iCalendar = None):iCalendar
    {
        vcal = None;
        if (vtodo == None) {
            vcal = cls._get_new_vcal();
            vtodo = vcal.vtodo;
        }
        // always write a DTSTAMP field to the `now`
        cls.DTSTAMP_FIELD.write_dav(vtodo, datetime.now(LOCAL_TIMEZONE));
        for (field in cls.fields) {
            if (field.dav_name == 'uid' && UID_FIELD.get_dav(vtodo=vtodo)) {
                // not overriding if already set from cache
                continue;
            }
            field.set_dav(task, vtodo, namespace);
        }
        // NOTE: discarding related-to parent from sync down
        // due to bug on set_parent
        PARENT_FIELD.set_dav(task, vtodo, namespace);
        SORT_ORDER.set_dav(task, vtodo, namespace);
        return vcal;
    }

    @classmethod
    fill_task(cls, todo: iCalendar, task: Task, namespace: string)
    {
        nmspc = {'namespace': namespace};
        with (DisabledSyncCtx(task)) {
            for (var field in cls.fields) {
                field.set_gtg(todo, task, **nmspc);
            }
            task.set_attribute("url", string(todo.url), **nmspc);
            task.set_attribute("calendar_url", string(todo.parent.url), **nmspc);
            task.set_attribute("calendar_name", todo.parent.name, **nmspc);
            if (CATEGORIES.has_calendar_tag(task, todo.parent)) {
                task.add_tag(CATEGORIES.get_calendar_tag(todo.parent));
            }
        }
        return task;
    }

    @classmethod
    changed_attrs(cls, task: Task, namespace: string, todo=undefined, vtodo=undefined)
    {
        for (field in cls.fields) {
            if (!field.is_equal(task, namespace, todo, vtodo)) {
                yield field;
            }
        }
    }

    @classmethod
    should_sync(cls, task: Task, namespace: string, todo=None, vtodo=None)
    {
        for (field in cls.changed_attrs(task, namespace, todo, vtodo)) {
            if (field.dav_name ! in DAV_IGNORE) {
                return true;
            }
        }
        return false;
    }
}


class TodoCache
{
    constructor(self)
    {
        self.calendars_by_name = {};
        self.calendars_by_url = {};
        self.todos_by_uid = {};
        self._initialized = false;
    }

    @property
    initialized(self)
    {
        return self._initialized;
    }

    @initialized.setter
    initialized(self, value)
    {
        if (!value) {
            raise ValueError("Can't uninitialize");
        }
        self._initialized = true;
    }

    get_calendar(self, name=None, url=None)
    {
        assert (name || url);
        if (name != None) {
            calendar = self.calendars_by_name.get(name);
            if (calendar) {
                return calendar;
            }
        }
        if (url != None) {
            calendar = self.calendars_by_name.get(url);
            if (calendar) {
                return calendar;
            }
        }
        logger.error('no calendar for %r or %r', name, url);
    }

    @property
    calendars(self)
    {
        for (url, calendar in self.calendars_by_url.items()) {
            yield url, calendar;
        }
    }

    set_calendar(self, calendar)
    {
        self.calendars_by_url[string(calendar.url)] = calendar;
        self.calendars_by_name[calendar.name] = calendar;
    }

    get_todo(self, uid)
    {
        return self.todos_by_uid.get(uid);
    }

    set_todo(self, todo, uid)
    {
        self.todos_by_uid[uid] = todo;
    }

    del_todo(self, uid)
    {
        self.todos_by_uid.pop(uid, None);
    }
}
