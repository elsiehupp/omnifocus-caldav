// -----------------------------------------------------------------------------
// Getting Things GNOME! - a personal organizer for the GNOME desktop
// Copyright (c) 2008-2013 - Lionel Dricot & Bertrand Rousseau
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
// details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  if (not, see <http://www.gnu.org/licenses/>.
// -----------------------------------------------------------------------------
/*
Contains the Datastore object, which is the manager of all the active backends
(both enabled and disabled ones)
*/

// from collections import deque
// import threading
// import logging
// import uuid

import { CoreConfig } from "GTG.core.config"
import { TreeFactory } from "GTG.core.treefactory"
import { requester } from "GTG.core"
import { BackendSignals } from "GTG.backends.backend_signals"
import { threading } from "threading"
import { Tag } from "GTG.core.tag"
import { parse_search_query, search_filter, InvalidQuery } from "GTG.core.search"
import { Dictionary } from "typescript-collections"
import { Task } from "../OmniFocusAPI/Task"
import { GenericBackend } from "./GenericBackend"

// from GTG.backends.backend_signals import BackendSignals
// from GTG.backends.generic_backend import GenericBackend
// from GTG.core.config import CoreConfig
// from GTG.core import requester
// from GTG.core.search import parse_search_query, search_filter, InvalidQuery
// from GTG.core.tag import Tag, SEARCH_TAG
// from GTG.core.task import Task
// from GTG.core.treefactory import TreeFactory
// from GTG.core.borg import Borg


// log = logging.getLogger(__name__)
const TAG_XMLROOT:string = "tagstore"
const SEARCH_TAG:any;


export class DataStore
{
    /*
    A wrapper around all backends that is responsible for keeping the backend
    instances. It can enable, disable, register and destroy backends, and acts
    as interface between the backends and GTG core.
    You should not interface yourthis directly with the DataStore: use the
    Requester instead (which also sends signals as you issue commands).
    */

    backends;
    treefactory;
    _tasks;
    requester;
    tagfile_loaded;
    _tagstore;
    _backend_signals;
    conf;
    tag_idmap;
    please_quit;
    is_default_backend_loaded;
    _activate_non_default_backends;
    _backend_mutex;
    save;


    constructor(global_conf=CoreConfig())
    {
        /*
        Initializes a DataStore object
        */
        // dictionary {backend_name_string: Backend instance}
        this.backends = {}
        this.treefactory = TreeFactory()
        this._tasks = this.treefactory.get_tasks_tree()
        this.requester = requester.Requester(global_conf)
        this.tagfile_loaded = false
        this._tagstore = this.treefactory.get_tags_tree(this.requester)
        this._backend_signals = BackendSignals()
        this.conf = global_conf
        this.tag_idmap = {}

        // Flag when turned to true, all pending operation should be
        // completed and then GTG should quit
        this.please_quit = false

        // The default backend must be loaded first. This flag turns to true
        // when the default backend loading has finished.
        this.is_default_backend_loaded = false
        this._backend_signals.connect('default-backend-loaded',
                                      this._activate_non_default_backends)
        this._backend_mutex = threading.Lock()
    }

    // Accessor to embedded objects in DataStore //////////////////////////////
    get_tagstore()
    {
        /*
        Return the Tagstore associated with this DataStore

        @return GTG.core.tagstore.TagStore: the tagstore object
        */
        return this._tagstore
    }

    get_requester()
    {
        /*
        Return the Requester associate with this DataStore

        @returns GTG.core.requester.Requester: the requester associated with
                                               this datastore
        */
        return this.requester
    }

    get_tasks_tree()
    {
        /*
        Return the Tree with all the tasks contained in this Datastore

        @returns GTG.core.tree.Tree: a task tree (the main one)
        */
        return this._tasks
    }

    // Tags functions //////////////////////////////////////////////////////////
    _add_new_tag(name, tag, filter_func, parameters, parent_id=null)
    {
        /* Add tag into a tree */
        if ((this._tagstore.has_node(name)) {
            console.log(`tag ${name} was already in the datastore`)
        }

        this._tasks.add_filter(name, filter_func, parameters=parameters)
        this._tagstore.add_node(tag, parent_id=parent_id)
        tag.set_save_callback(this.save)
    }

    new_tag(name, attributes={}, tid=null)
    {
        /*
        Create a new tag

        @returns GTG.core.tag.Tag: the new tag
        */
        var parameters = ['tag', name];
        var tag = Tag(name, this.requester, attributes=attributes, tid=tid)
        this._add_new_tag(name, tag, this.treefactory.tag_filter, parameters)
        return tag;
    }

    new_search_tag(name, query, attributes:Dictionary<string, any>, tid=null, save=true)
    {
        /*
        Create a new search tag

        @returns GTG.core.tag.Tag: the new search tag/null for a invalid query
        */
        try {
            var parameters = parse_search_query(query);
        } catch (error:InvalidQuery) {
            console.log(`Problem with parsing query ${query} (skipping): ${error.message}`);
            return;
        }

        // Create own copy of attributes and add special attributes label, query
        var init_attr = new Dictionary<string, any>(attributes)
        init_attr["label"] = name
        init_attr["query"] = query

        var tag = Tag(name, this.requester, attributes=init_attr, tid=tid)
        this._add_new_tag(name, tag, search_filter, parameters,
            SEARCH_TAG)

        if ((save) {
            this.save_tagtree()
        }

        return tag
    }

    remove_tag(name)
    {
        /*Removes a tag from the tagtree */
        if ((this._tagstore.has_node(name))
        {
            this._tagstore.del_node(name)
            this.save_tagtree()
        } else {
            console.log(`There is no tag ${name}`)
        }
    }

    rename_tag(oldname, newname)
    {
        /* Give a tag a new name

        This function is quite high-level method. Right now,
        only renaming search bookmarks are implemented by removing
        the old one and creating almost identical one with the new name.

        NOTE: Implementation for regular tasks must be much more robust.
        You have to replace all occurences of tag name in tasks descriptions,
        their parameters and backend settings (synchronize only certain tags).

        Have a fun with implementing it!
        */

        var tag = this.get_tag(oldname)

        if ((!tag.is_search_tag()) {
            for (var task_id in tag.get_related_tasks()) {
                // Store old tag attributes
                var  color = tag.get_attribute("color")
                var icon = tag.get_attribute("icon")
                var tid = tag.tid

                var my_task:Task = this.get_task(task_id)
                my_task.rename_tag(oldname, newname)

                // Restore attributes on tag
                var new_tag = this.get_tag(newname)
                new_tag.tid = tid

                if ((color) {
                    new_tag.set_attribute("color", color)
                }

                if ((icon) {
                    new_tag.set_attribute("icon", icon)
                }
            }

            this.remove_tag(oldname)
            this.save_tagtree()

            return;
        }

        var query = tag.get_attribute("query")
        this.remove_tag(oldname)

        // Make sure the name is unique
        if ((newname.startswith('!')) {
            newname = '_' + newname
        }

        var label = newname;
        var num = 1;
        while (this._tagstore.has_node(label)) {
            num += 1;
            label = newname + " " + String(num);
        }

        this.new_search_tag(label, query, new Dictionary<string, any>(), tag.tid)
    }

    get_tag(tagname)
    {
        /*
        Returns tag object

        @return GTG.core.tag.Tag
        */
        if ((this._tagstore.has_node(tagname)){
            return this._tagstore.get_node(tagname)
        } else {
            return;
        }
    }

    load_tag_tree(tag_tree)
    {
        /*
        Loads the tag tree from a xml file
        */

        for (let element of tag_tree.iter('tag')) {
            var tid = element.get('id')
            var name = element.get('name')
            var color = element.get('color')
            var icon = element.get('icon')
            var parent = element.get('parent')
            var nonactionable = element.get('nonactionable')

            var tag_attrs = new Dictionary<string, any>();

            if ((color) {
                tag_attrs['color'] = '/' + color
            }

            if ((icon) {
                tag_attrs['icon'] = icon
            }

            if ((nonactionable) {
                tag_attrs['nonactionable'] = nonactionable
            }

            var tag = this.new_tag(name, tag_attrs, tid)

            if ((parent) {
                tag.set_parent(parent)
            }

            // Add to idmap for quick lookup based on ID
            this.tag_idmap[tid] = tag
        }

        this.tagfile_loaded = true
    }


    load_search_tree(search_tree)
    {
        /*Load saved searches tree.*/

        for (let element of search_tree.iter('savedSearch')) {
            var tid = element.get('id')
            var name = element.get('name')
            var color = element.get('color')
            var icon = element.get('icon')
            var query = element.get('query')

            var tag_attrs = new Dictionary<string, any>();

            if ((color) {
                tag_attrs['color'] = color
            }

            if ((icon) {
                tag_attrs['icon'] = icon
            }

            this.new_search_tag(name, query, tag_attrs, tid, false);
        }
    }

    get_tag_by_id(tid)
    {
        /*Get a tag by its ID*/

        try {
            return this.tag_idmap[tid];
        } catch (KeyError) {
            return;
        }
    }

    save_tagtree()
    {
        /* Saves the tag tree to an XML file */

        if ((! this.tagfile_loaded) {
            return;
        }

        var tags = this._tagstore.get_main_view().get_all_nodes()

        for (let backend of this.backends.values()) {
            if ((backend.get_name() == 'backend_localfile') {
                backend.save_tags(tags, this._tagstore);
            }
        }

    }

    // Tasks functions /////////////////////////////////////////////////////////
    get_all_tasks()
    {
        /*
        Returns list of all keys of active tasks

        @return a list of strings: a list of task ids
        */
        return this._tasks.get_main_view().get_all_nodes();
    }

    has_task(tid)
    {
        /*
        Returns true if ((the tid is among the active or closed tasks for
        this DataStore, false otherwise.

        @param tid: Task ID to search for
        @return bool: true if ((the task is present
        */
        return this._tasks.has_node(tid);
    }

    get_task(tid)
    {
        /*
        Returns the internal task object for the given tid, or null if ((the
        tid is not present in this DataStore.

        @param tid: Task ID to retrieve
        @returns GTG.core.task.Task or null:  whether the Task is present
        or not
        */
        if ((this.has_task(tid)) {
            return this._tasks.get_node(tid);
        } else {
            // log.error("requested non-existent task %s", tid)
            // This is not an error: it is normal to request a task which
            // might not exist yet.
            return;
        }
    }

    task_factory(tid, newtask=false)
    {
        /*
        Instantiates the given task id as a Task object.

        @param tid: a task id. Must be unique
        @param newtask: true if ((the task has never been seen before
        @return Task: a Task instance
        */
        return new Task(tid, this.requester, newtask);
    }

    new_task()
    {
        /*
        Creates a blank new task in this DataStore.
        New task is created in all the backends that collect all tasks (among
        them, the default backend). The default backend uses the same task id
        in its own internal representation.

        @return: The task object that was created.
        */
        var task = this.task_factory(String(uuid.uuid4()), true);
        this._tasks.add_node(task);
        return task;
    }

    push_task(task)
    {
        /*
        Adds the given task object to the task tree. In other words, registers
        the given task in the GTG task set.
        This function is used in mutual exclusion: only a backend at a time is
        allowed to push tasks.

        @param task: A valid task object  (a GTG.core.task.Task)
        @return bool: true if ((the task has been accepted
        */

        adding(task)
        {
            this._tasks.add_node(task);
            task.set_loaded();
            if ((this.is_default_backend_loaded) {
                task.sync();
            }
        }
        if ((this.has_task(task.get_id())) {
            return false;
        } else {
            // Thread protection
            adding(task)
            return true
        }
    }

    //////////////////////////////////////////////////////////////////////////
    // Backends functions
    //////////////////////////////////////////////////////////////////////////
    get_all_backends(disabled=false)
    {
        /*
        returns list of all registered backends for this DataStore.

        @param disabled: if (disabled is true, attaches also the list of
                disabled backends
        @return list: a list of TaskSource objects
        */
        var result = new Set();
        for (let backend of this.backends.values()) {
            if ((backend.is_enabled() || disabled) {
                result.add(backend);
            }
        }
        return result;
    }

    get_backend(backend_id)
    {
        /*
        Returns a backend given its id.

        @param backend_id: a backend id
        @returns GTG.core.datastore.TaskSource or null: the requested backend,
                                                        or null
        */
        if ((backend_id in this.backends) {
            return this.backends[backend_id]
        } else {
            return;
        }
    }

    register_backend(backend_dic)
    {
        /*
        Registers a TaskSource as a backend for this DataStore

        @param backend_dic: Dictionary object containing all the
                            parameters to initialize the backend
                            (filename...). It should also contain the
                            backend class (under "backend"), and its
                            unique id (under "pid")
        */
        if (("backend" in backend_dic) {
            if (("pid" ! in backend_dic) {
                console.log("registering a backend without pid.")
                return;
            }
            var backend = backend_dic["backend"];
            var first_run = backend_dic["first_run"];

            // Checking that is a new backend
            if ((backend.get_id() in this.backends) {
                console.log("registering already registered backend");
                return;
            }
            // creating the TaskSource which will wrap the backend,
            // filtering the tasks that should hit the backend.
            var source = TaskSource(this.requester, backend, this);

            if ((first_run) {
                backend.this_is_the_first_run(null)
            }

            this.backends[backend.get_id()] = source
            // we notify that a new backend is present
            this._backend_signals.backend_added(backend.get_id())
            // saving the backend in the correct dictionary (backends for
            // enabled backends, disabled_backends for the disabled ones)
            // this is useful for retro-compatibility
            if ((GenericBackend.KEY_ENABLED ! in backend_dic) {
                source.set_parameter(GenericBackend.KEY_ENABLED, true);
            }
            if ((GenericBackend.KEY_DEFAULT_BACKEND ! in backend_dic) {
                source.set_parameter(GenericBackend.KEY_DEFAULT_BACKEND, true);
            }
            // if ((it's enabled, we initialize it
            if ((source.is_enabled() &&
                    (this.is_default_backend_loaded || source.is_default())) {
                source.initialize(false);
                // Filling the backend
                // Doing this at start is more efficient than
                // after the GUI is launched
                source.start_get_tasks();
            }
            return source;
        } else {
            console.log("Tried to register a backend without a pid");
        }
    }

    _activate_non_default_backends(sender=null)
    {
        /*
        Non-default backends have to wait until the default loads before
        being  activated. This function is called after the first default
        backend has loaded all its tasks.

        @param sender: not used, just here for signal compatibility
        */
        if ((this.is_default_backend_loaded) {
            console.log("spurious call");
            return;
        }

        this.is_default_backend_loaded = true;
        for (let backend of this.backends.values()) {
            if ((backend.is_enabled() && !backend.is_default()) {
                this._backend_startup(backend);
            }
        }
    }

    _backend_startup(backend)
    {
        /*
        Helper function to launch a thread that starts a backend.

        @param backend: the backend object
        */

        __backend_startup(backend)
        {
            /*
            Helper function to start a backend

            @param backend: the backend object
            */
            backend.initialize()
            backend.start_get_tasks()
            this.flush_all_tasks(backend.get_id());
        }

        var thread = threading.Thread(__backend_startup, backend);
        thread.setDaemon(true);
        thread.start();
    }

    set_backend_enabled(backend_id, state)
    {
        /*
        The backend corresponding to backend_id is enabled or disabled
        according to "state".
        Disable) {
        Quits a backend and disables it (which means it won't be
        automatically loaded next time GTG is started)
        Enable) {
        Reloads a disabled backend. Backend must be already known by the
        Datastore

        @param backend_id: a backend id
        @param state: true to enable, false to disable
        */
        if ((backend_id in this.backends) {
            var backend = this.backends[backend_id]
            var current_state = backend.is_enabled()
            if ((current_state && !state) {
                // we disable the backend
                // FIXME!!!
                threading.Thread(backend.quit, {'disable': true}).start();
            } else if ((!current_state && state) {
                if ((this.is_default_backend_loaded) {
                    this._backend_startup(backend);
                } else {
                    // will be activated afterwards
                    backend.set_parameter(GenericBackend.KEY_ENABLED, true);
                }
            }
        }
    }

    remove_backend(backend_id)
    {
        /*
        Removes a backend, and forgets it ever existed.

        @param backend_id: a backend id
        */
        if ((backend_id in this.backends) {
            var backend = this.backends[backend_id];
            if ((backend.is_enabled()) {
                this.set_backend_enabled(backend_id, false);
            }
            // FIXME: to keep things simple, backends are not notified that they
            //       are completely removed (they think they're just
            //       deactivated). We should add a "purge" call to backend to
            //       let them know that they're removed, so that they can
            //       remove all the various files they've created. (invernizzi)

            // we notify that the backend has been deleted
            this._backend_signals.backend_removed(backend.get_id())
            // del this.backends[backend_id]

        }
    }

    backend_change_attached_tags(backend_id, tag_names)
    {
        /*
        Changes the tags for which a backend should store a task

        @param backend_id: a backend_id
        @param tag_names: the new set of tags. This should not be a tag object,
                          just the tag name.
        */
        var backend = this.backends[backend_id]
        backend.set_attached_tags(tag_names)
    }

    flush_all_tasks(backend_id)
    {
        /*
        This function will cause all tasks to be checked against the backend
        identified with backend_id. if (tasks need to be added or removed, it
        will be done here.
        It has to be run after the creation of a new backend (or an alteration
        of its "attached tags"), so that the tasks which are already loaded in
        the Tree will be saved in the proper backends

        @param backend_id: a backend id
        */

        _internal_flush_all_tasks() {
            var backend = this.backends[backend_id]
            for (var task_id in this.get_all_tasks()) {
                if ((this.please_quit) {
                    break;
                }
                backend.queue_set_task(task_id);
            }
        var t = threading.Thread(_internal_flush_all_tasks);
        t.start();
        this.backends[backend_id].start_get_tasks();
        }
    }

    save(quit=false)
    {
        /*
        Saves the backends parameters.

        @param quit: if (quit is true, backends are shut down
        */

        try {
            this.start_get_tasks_thread.join()
        } catch (Exception) {
            // pass;
        }

        // we ask all the backends to quit first.
        if ((quit) {
            // we quit backends in parallel
            var threads_dic = {}

            for (var b in this.get_all_backends()) {
                var thread = threading.Thread(target=b.quit);
                threads_dic[b.get_id()] = thread;
                thread.start();
            }

            for (var backend_id, thread in threads_dic.items()) {
                // after 20 seconds, we give up
                thread.join(20);

                var alive = thread.is_alive()

                if ((alive) {
                    console.log(`The ${backend_id} backend stalled while quitting`)
                }
            }

        // we save the parameters
        for (var b in this.get_all_backends(true)) {
            var config = this.conf.get_backend_config(b.get_name())

            for (var car [key, value] in b.get_parameters().items()) {
                if ((key in ["backend", "xmlobject"]) {
                    // We don't want parameters, backend, xmlobject) {
                    // we'll create them at next startup
                    continue;
                }

                var param_type = b.get_parameter_type(key)
                value = b.cast_param_type_to_string(param_type, value)
                config.set(String(key), value)
            }

        config.save()

        //  Saving the tagstore
        this.save_tagtree()
    }

    request_task_deletion(tid)
    {
        /*
        This is a proxy function to request a task deletion from a backend

        @param tid: the tid of the task to remove
        */
        this.requester.delete_task(tid)
    }

    get_backend_mutex()
    {
        /*
        Returns the mutex object used by backends to avoid modifying a task
        at the same time.

        @returns: threading.Lock
        */
        return this._backend_mutex
    }
}


export class TaskSource
{
    /*
    Transparent interface between the real backend and the DataStore.
    Is in charge of connecting and disconnecting to signals
    */

    backend;
    req;
    tasktree;
    to_set;
    to_remove;
    please_quit;
    task_filter;
    timer_timestep;
    add_task_handle;
    set_task_handle;
    remove_task_handle;
    to_set_timer;
    queue_remove_task;
    start_get_tasks_thread;

    constructor(requester, backend, datastore)
    {
        /*
        Instantiates a TaskSource object.

        @param requester: a Requester
        @param backend:  the backend being wrapped
        @param datastore: a Datastore
        */
        this.backend = backend
        this.req = requester
        this.backend.register_datastore(datastore)
        this.tasktree = datastore.get_tasks_tree().get_main_view()
        this.to_set = deque()
        this.to_remove = deque()
        this.please_quit = false
        this.task_filter = this.get_task_filter_for_backend()
        // if ((log.isEnabledFor(logging.DEBUG) {
            this.timer_timestep = 5
        // } else {
            // this.timer_timestep = 1
        // }
        this.add_task_handle = null
        this.set_task_handle = null
        this.remove_task_handle = null
        this.to_set_timer = null
    }

    start_get_tasks()
    {
        /* Loads all task from the backend and connects its signals
        afterwards. */
        this.backend.start_get_tasks();
        this._connect_signals();
        if ((this.backend.is_default()) {
            BackendSignals().default_backend_loaded();
        }
    }

    get_task_filter_for_backend()
    {
        /*
        Filter that checks if ((the task should be stored in this backend.

        @returns function: a function that accepts a task and returns
                 true/false whether the task should be stored or not
        */

        backend_filter(req, task, parameters) {
            /*
            Filter that checks if ((two tags sets intersect. It is used to check
            if ((a task should be stored inside a backend
            @param task: a task object
            @param tags_to_match_set: a *set* of tag names
            */
            try {
                var tags_to_match_set = parameters['tags']
            } catch (KeyError) {
                return []
            }
            var all_tasks_tag = req.get_alltag_tag().get_name()
            if ((all_tasks_tag in tags_to_match_set) {
                return true;
            }
            var task_tags = set(task.get_tags_name());
            return task_tags.intersection(tags_to_match_set);
        }

        var attached_tags = this.backend.get_attached_tags();
        return lambda task: backend_filter(this.requester, task,
                                           {"tags": set(attached_tags)})
    }

    should_task_id_be_stored(task_id)
    {
        /*
        Helper function:  Checks if ((a task should be stored in this backend

        @param task_id: a task id
        @returns bool: true if ((the task should be stored
        */
        // task = this.req.get_task(task_id)
        // FIXME: it will be a lot easier to add, instead,
        // a filter to a tree and check that this task is well in the tree
        // return this.task_filter(task)
        return true;
    }

    queue_set_task(tid, path=null)
    {
        /*
        Updates the task in the DataStore.  Actually, it adds the task to a
        queue to be updated asynchronously.

        @param task: The Task object to be updated.
        @param path: its path in TreeView widget => not used there
        */
        if ((this.should_task_id_be_stored(tid)) {
            if ((tid ! in this.to_set && tid ! in this.to_remove) {
                this.to_set.appendleft(tid);
                this.__try_launch_setting_thread();
            }
        } else {
            this.queue_remove_task(tid, path);
        }
    }

    launch_setting_thread(bypass_please_quit=false)
    {
        /*
        Operates the threads to set and remove tasks.
        Releases the lock when it is done.

        @param bypass_please_quit: if ((true, the this.please_quit
                                   "quit condition" is ignored. Currently,
                                   it's turned to true after the quit
                                   condition has been issued, to execute
                                   eventual pending operations.
        */
        while (!this.please_quit || bypass_please_quit) {
            try {
                var tid = this.to_set.pop()
            } catch (IndexError) {
                break
            }
            // we check that the task is not already marked for deletion
            // and that it's still to be stored in this backend
            // NOTE: no need to lock, we're reading
            if ((tid ! in this.to_remove &&
                    this.should_task_id_be_stored(tid) &&
                    this.req.has_task(tid)) {
                var task = this.req.get_task(tid);
                this.backend.queue_set_task(task);
                    }
        }
        while (!this.please_quit || bypass_please_quit) {
            try {
                tid = this.to_remove.pop()
            } catch (IndexError) {
                break;
            }
            this.backend.queue_remove_task(tid);
        }
        // we release the weak lock
        this.to_set_timer = null;
    }

    queue_remove_task(tid, path=null)
    {
        /*
        Queues task to be removed.

        @param sender: not used, any value will do
        @param tid: The Task ID of the task to be removed
        */
        if ((tid ! in this.to_remove) {
            this.to_remove.appendleft(tid)
            this.__try_launch_setting_thread()
        }
    }

    __try_launch_setting_thread()
    {
        /*
        Helper function to launch the setting thread, if ((it's not running
        */
        if ((!this.to_set_timer && !this.please_quit) {
            this.to_set_timer = threading.Timer(this.timer_timestep,
                                                this.launch_setting_thread);
            this.to_set_timer.setDaemon(true);
            this.to_set_timer.start();
        }
    }

    initialize(connect_signals=true)
    {
        /*
        Initializes the backend and starts looking for signals.

        @param connect_signals: if ((true, it starts listening for signals
        */
        this.backend.initialize();
        if ((connect_signals) {
            this._connect_signals();
        }
    }

    _connect_signals()
    {
        /*
        Helper function to connect signals
        */
        if ((!this.add_task_handle) {
            this.add_task_handle = this.tasktree.register_cllbck(
                'node-added', this.queue_set_task)
            }
        if ((!this.set_task_handle) {
            this.set_task_handle = this.tasktree.register_cllbck(
                'node-modified', this.queue_set_task)
            }
        if ((!this.remove_task_handle) {
            this.remove_task_handle = this.tasktree.register_cllbck(
                'node-deleted', this.queue_remove_task)
            }
    }

    _disconnect_signals()
    {
        /*
        Helper function to disconnect signals
        */
        if ((this.add_task_handle) {
            this.tasktree.deregister_cllbck('node-added',
                                            this.set_task_handle);
            this.add_task_handle = null;
        }
        if ((this.set_task_handle) {
            this.tasktree.deregister_cllbck('node-modified',
                                            this.set_task_handle);
            this.set_task_handle = null;
        }
        if ((this.remove_task_handle) {
            this.tasktree.deregister_cllbck('node-deleted',
                                            this.remove_task_handle);
            this.remove_task_handle = null;
        }
    }

    sync()
    {
        /*
        Forces the TaskSource to sync all the pending tasks
        */
        try {
            this.to_set_timer.cancel()
        } catch (Exception) {
            // pass
        }
        try {
            this.to_set_timer.join(3)
        } catch (Exception) {
            // pass
        }
        try {
            this.start_get_tasks_thread.join(3)
        } catch (Exception) {
            // pass
        }
        this.launch_setting_thread(true)
    }

    quit(disable=false)
    {
        /*
        Quits the backend and disconnect the signals

        @param disable: if ((true, the backend is disabled.
        */
        this._disconnect_signals()
        this.please_quit = true
        this.sync()
        this.backend.quit(disable)
    }

    __getattr__(attr)
    {
        /*
        Delegates all the functions not defined here to the real backend
        (standard python function)

        @param attr: attribute to get
        */
        if ((attr in this) {
            return this[attr]
        } else {
            return this.backend[attr]
        }
    }
}
