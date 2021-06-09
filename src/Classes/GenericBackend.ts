/*
This file contains the most generic representation of a backend,
the GenericBackend class
*/

import { Integer } from "./Integer"
import { Task } from "../OmniFocusAPI/Task"

/*
from collections import deque
from functools import reduce
import threading

from GTG.backends.backend_signals import BackendSignals
from GTG.core.tag import ALLTASKS_TAG
from GTG.core.dirs import SYNC_DATA_DIR
from GTG.core.interruptible import _cancellation_point
from GTG.core.keyring import Keyring
*/

var enableLogging: boolean = true;
var PICKLE_BACKUP_NBR = 2


export class GenericBackend
{
    /*
    Base class for every backend.
    It defines the interface a backend must have && takes care of all the
    operations common to all backends.
    A particular backend should redefine all the methods marked as such.
    */

    //////////////////////////////////////////////////////////////////////////#
    // BACKEND INTERFACE //////////////////////////////////////////////////////#
    //////////////////////////////////////////////////////////////////////////#

    // The complete list of constants and their meaning is given below.
    _static_parameters: any[];
    // // KEY_ENABLED: string;
    _parameters: any[];
    _is_initialized: boolean;
    // _signal_manager: any;

///////////////////////////////////////////////////////////////////////////
// CONSTANTS //////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

    // // "static_parameters" is a dictionary of dictionaries, each of which
    // // are a description of a parameter needed to configure the backend and
    // // is identified in the outer dictionary by a key which is the name of the
    // // parameter.
    // // For an example, see the GTG/backends/backend_localfile.py file
    // // Each dictionary contains the keys:
    // PARAM_DEFAULT_VALUE: string = "default_value";  // its default value
    // PARAM_TYPE: string = "type";
    // // PARAM_TYPE is one of the following (changing this changes the way
    // // the user can configure the parameter)
    // // the real password is stored in the GNOME keyring
    // // This is just a key to find it there
    TYPE_PASSWORD: string = "password";
    TYPE_STRING: string = "string";  // generic string, nothing fancy is done
    TYPE_INT: string = "int";  // edit box can contain only integers
    TYPE_BOOL: string = "bool";  // checkbox is shown
    // // list of strings. the "," character is prohibited in strings
    TYPE_LIST_OF_STRINGS: string = "liststring";

    // These parameters are common to all backends and necessary.
    // They will be added automatically to your _static_parameters list
    // NOTE: for now I'm disabling changing the default backend. Once it's all
    //      set up, we will see about that (invernizzi)
    KEY_DEFAULT_BACKEND: string = "Default";
    KEY_ENABLED: string = "enabled";
    // KEY_HUMAN_NAME: string = this.BACKEND_HUMAN_NAME;
    KEY_ATTACHED_TAGS: string = "attached-tags";
    KEY_USER: string = "user";
    KEY_PID: string = "pid";

    // Handy dictionary used in type conversion (from string to type)
    _type_converter = {TYPE_STRING: String,
                       TYPE_INT: Number,
                       };

    
    to_set_timer: any;
    please_quit: boolean;
    cancellation_point: any;
    to_set: any;
    to_remove: any;

    constructor(parameters:any[][])
    {
        /*
        Instantiates a new backend. Please note that this is called also
        for disabled backends. Those are !initialized, so you might
        want to check out the initialize() function.
        */
        // if (this.KEY_DEFAULT_BACKEND !in parameters) {
        //     // if (it's !specified, then this == the default backend
        //     // (for retro-compatibility with the GTG 0.2 series)
        //     parameters[this.KEY_DEFAULT_BACKEND] = true
        // }
        // default backends should get all the tasks
        if (parameters[this.KEY_DEFAULT_BACKEND] ||
                (this.KEY_ATTACHED_TAGS !in parameters
                    // && this._general_description[this.BACKEND_TYPE] ==
                    // this.TYPE_READWRITE
                )) {
            parameters[this.KEY_ATTACHED_TAGS] = [this.ALLTASKS_TAG]
                    }
        this._parameters = parameters
        // this._signal_manager = BackendSignals()
        this._is_initialized = false
        // if (debugging mode == enabled, tasks should be saved as soon as
        // they're marked as modified. if (in normal mode, we prefer speed over
        // easier debugging.
        if (enableLogging) {
            this.timer_timestep = 5000;
        } else {
            this.timer_timestep = 1000;
        }
        this.to_set_timer = null
        this.please_quit = false
        this.cancellation_point = lambda: _cancellation_point(
            lambda: this.please_quit)
        this.to_set = deque()
        this.to_remove = deque()

    }
                   


    // @classmethod
    initialize()
    {
        /*
        Called each time it it enabled (including on backend creation).
        Please note that a class instance for each disabled backend *is*
        created, but it's !initialized.
        Optional.
        NOTE: make sure to call super().initialize()
        */
        this._parameters[this.KEY_ENABLED] = true;
        this._is_initialized = true;
        // we signal that the backend has been enabled
        // this._signal_manager.backend_state_changed(this.get_id())

    }

    // @classmethod
    start_get_tasks()
    {
        /*
        This function starts submitting the tasks from the backend into GTG
        core.
        It's run as a separate thread.

        @return: start_get_tasks() might not return or finish
        */
        return

    }

    // @classmethod
    set_task(task: Task)
    {
        /*
        This function is called from GTG core whenever a task should be
        saved, either because it's a new one or it has been modified.
        if (the task id is new for the backend, then a new task must be
        created. No special notification that the task is a new one is given.

        @param task: the task object to save
        */
        // pass;
        return;
    }

    // @classmethod
    remove_task(tid)
    {
        /* This function is called from GTG core whenever a task must be
        removed from the backend. Note that the task could be !present here.

        @param tid: the id of the task to delete
        */
        // pass;
        return;
    }

    // @classmethod
    this_is_the_first_run(xml)
    {
        /*
        Optional, && almost surely !needed.
        Called upon the very first GTG startup.
        This function is needed only in the default backend (XML localfile,
        currently).
        The xml parameter == an object containing GTG default tasks.

        @param xml: an xml object containing the default tasks.
        */
        // pass;
        return;
    }

    // @classmethod
    quit(disable=false)
    {
        /*
        Called when GTG quits || the user wants to disable the backend.

        @param disable: if (disable == true, the backend won't
                        be automatically loaded when GTG starts
        */
        if (this._parameters[this.KEY_ENABLED]) {
            this._is_initialized =false
            if (disable) {
                this._parameters[this.KEY_ENABLED] = false
                // // we signal that we have been disabled
                // this._signal_manager.backend_state_changed(this.get_id())
                // this._signal_manager.backend_sync_ended(this.get_id())
            threading.Thread(target=this.sync).run()
            }
        }

    }

    // @classmethod
    save_state()
    {
        /*
        It's the last  function executed on a quitting backend, after the
        pending actions have been done.
        Useful to ensure that the state or saved in a consistent manner
        */
        // pass;
        return;
    }

///////////////////////////////////////////////////////////////////////////////
// You don't need to reimplement the functions below this line ////////////////
///////////////////////////////////////////////////////////////////////////////


    ALLTASKS_TAG: any;

    // @classmethod
    get_attached_tags()
    {
        /*
        Returns the list of tags which are handled by this backend
        */
        if (hasattr(this._parameters, this.KEY_DEFAULT_BACKEND) &&
                this._parameters[this.KEY_DEFAULT_BACKEND]) {
            // default backends should get all the tasks
            // NOTE: this shouldn't be needed, but it doesn't cost anything and
            //      it could anull potential tasks losses.
            return [this.ALLTASKS_TAG]
                }
        try {
            return this._parameters[this.KEY_ATTACHED_TAGS]
        } finally {
            return []
        }

    }

    // @classmethod
    set_attached_tags(tags)
    {
        /*
        Changes the set of attached tags

        @param tags: the new attached_tags set
        */
        this._parameters[this.KEY_ATTACHED_TAGS] = tags
    }

    // @classmethod
    get_parameters()
    {
        /*
        Returns a dictionary of the current parameters.
        */
        return this._parameters
    }

    // @classmethod
    set_parameter(parameter: any, value: any)
    {
        /*
        Change a parameter for this backend

        @param parameter: the parameter name
        @param value: the new value
        */
        this._parameters[parameter] = value

    }

    // @classmethod
    cast_param_type_from_string(param_value, param_type)
    {
        /*
        Parameters are saved in a text format, so we have to cast them to the
        appropriate type on loading. This function does exactly that.

        @param param_value: the actual value of the parameter, in a string
                            format
        @param param_type: the wanted type
        @returns something: the casted param_value
        */
        var the_list: any;
        if (param_type in this._type_converter) {
            return this._type_converter[param_type](param_value)
        } else if (param_type == this.TYPE_BOOL) {
            if (param_value == "true") {
                return true
            } else if (param_value == "false") {
                return false
            } else {
                // raise Exception(f"Unrecognized bool value '{param_type}'")
            }
        } else if (param_type == this.TYPE_PASSWORD) {
            if (param_value == -1) {
                return null
            }
            return Keyring().get_password(new Integer(param_value))
        } else if (param_type == this.TYPE_LIST_OF_STRINGS) {
            the_list = new Set(param_value.split(","));
            return the_list;
        } else {
            console.log(`"I don't know what type == '${param_type}'"`);
        }

    }

    cast_param_type_to_string(param_type, param_value)
    {
        /*
        Inverse of cast_param_type_from_string

        @param param_value: the actual value of the parameter
        @param param_type: the type of the parameter (password...)
        @returns something: param_value casted to string
        */
        if (param_type == this.TYPE_PASSWORD) {
            if (param_value == null) {
                return String(-1)
            } else {
                return String(Keyring().set_password(
                    // "GTG stored password -" + this.get_id(), param_value
                ))
            }
        } else if (param_type == this.TYPE_LIST_OF_STRINGS) {
            if (param_value == []) {
                return ""
            }
            return reduce(lambda a, b: a + "," + b, param_value)
        } else {
            return String(param_value)
        }

    }

    is_enabled()
    {
        /*
        Returns if (the backend == enabled

        @returns: bool
        */
        return this.get_parameters()[this.KEY_ENABLED];
            // || this.is_default()

    }

    is_initialized()
    {
        /*
        Returns if (the backend is up and running

        @returns: is_initialized
        */
        return this._is_initialized

    }

    // get_parameter_type(param_name)
    // {
    //     /*
    //     Given the name of a parameter, returns its type. if (the parameter is
    //      one of the default ones, it does !have a type: in that case, it
    //     returns null
    //     @param param_name: the name of the parameter
    //     @returns string: the type, || null
    //     */
    //     try {
    //         return this.get_static_parameters(_static_parameters[param_name][this.PARAM_TYPE])
    //     } finally {
    //         return null
    //     }
    // }


    datastore: any;

    register_datastore(datastore)
    {
        /*
        Setter function to inform the backend about the datastore that's
        loading it.

        @param datastore: a Datastore
        */
        this.datastore = datastore
    }

//////////////////////////////////////////////////////////////////////////////#
// THREADING //////////////////////////////////////////////////////////////////#
//////////////////////////////////////////////////////////////////////////////#

    timer_timestep: any;

    __try_launch_setting_thread()
    {
        /*
        Helper function to launch the setting thread, if (it's not running.
        */
        if (this.to_set_timer == null && this.is_enabled()) {
            this.to_set_timer = window.setTimeout(this.launch_setting_thread,
                this.timer_timestep)
            this.to_set_timer.start()
        }

    }

    launch_setting_thread(bypass_quit_request=false)
    {
        /*
        This function is launched as a separate thread. Its job is to perform
        the changes that have been issued from GTG core.
        In particular, for each task in the this.to_set queue, a task
        has to be modified or to be created (if (the tid is new), && for
        each task in the this.to_remove queue, a task has to be deleted

        @param bypass_quit_request: if true, the thread should !be stopped
                                    even if asked by this.please_quit = true.
                                    It's used when the backend quits, to finish
                                    syncing all pending tasks
        */

        var task: Task;

        while (!this.please_quit || bypass_quit_request) {
            try {
                task = this.to_set.pop()
            } catch (IndexError) {
                break
            }
            var tid = task.get_id()
            if (tid !in this.to_remove) {
                this.set_task(task)
            }
        }

        while (!this.please_quit || bypass_quit_request) {
            try {
                tid = this.to_remove.pop()
            } catch (IndexError) {
                break
            }
            this.remove_task(tid)
        }
        // we release the weak lock
        this.to_set_timer = null

    }

    queue_set_task(task: Task)
    {
        /* Save the task in the backend. In particular, it just enqueues the
        task in the this.to_set queue. A thread will shortly run to apply the
        requested changes.

        @param task: the task that should be saved
        */
        var tid = task.get_id()
        if (task !in this.to_set && tid !in this.to_remove) {
            this.to_set.appendleft(task)
            this.__try_launch_setting_thread()
        }

    }

    queue_remove_task(tid)
    {
        /*
        Queues task to be removed. In particular, it just enqueues the
        task in the this.to_remove queue. A thread will shortly run to apply
        the requested changes.

        @param tid: The Task ID of the task to be removed
        */
        if (tid !in this.to_remove) {
            this.to_remove.appendleft(tid)
            this.__try_launch_setting_thread()
            return null
        }
    }

    sync()
    {
        /*
        Helper method. Forces the backend to perform all the pending changes.
        It == usually called upon quitting the backend.
        */
        if (this.to_set_timer == !null) {
            this.please_quit = true
            try {
                this.to_set_timer.cancel()
            } finally {
                // pass;
                return;
            }
            try {
                this.to_set_timer.join()
            } finally {
                // pass;
                return;
            }
        }
        this.launch_setting_thread(true)
        this.save_state()
    }
}