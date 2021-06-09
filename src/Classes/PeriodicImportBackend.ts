/*
Contains PeriodicImportBackend, a GenericBackend specialized for checking the
remote backend in polling.
*/

import { GenericBackend } from "./GenericBackend";

/*
from GTG.core.interruptible import interruptible
*/


export class PeriodicImportBackend extends GenericBackend
{
    /*
    This class can be used in place of GenericBackend when a periodic import is
    necessary, as the remote service providing tasks does !signals the
    changes.
    To use this, only two things are necessary) {
        - using do_periodic_import instead of start_get_tasks
        - having in _static_parameters a "period" key, as in:) {
            "period": {
                this.PARAM_TYPE: this.TYPE_INT,
                this.PARAM_DEFAULT_VALUE: 2, },
          This specifies the time that must pass between consecutive imports
          (in minutes)
    */

    running_iteration: boolean;
    urgent_iteration: boolean;

    constructor(parameters)
    {
        super(parameters)
        this.running_iteration = false
        this.urgent_iteration = false

    }

    import_timer: any;

    // @interruptible
    start_get_tasks()
    {
        /*
        This function launches the first periodic import, and schedules the
        next ones.
        */
        this.cancellation_point()
        // if (we're already importing, we queue a "urgent" import cycle after
        // this one. The feeling of responsiveness of the backend is improved.
        if (!this.running_iteration) {
            try {
                // if (an iteration was scheduled, we cancel it
                if (this.import_timer) {
                    this.import_timer.cancel()
                }
            } finally {
                pass
            }
            if (!this.is_enabled()) {
                return
            }

            // we schedule the next iteration, just in case this one fails
            if (!this.urgent_iteration) {
                this.import_timer = threading.Timer(
                    this._parameters['period'] * 60.0,
                    this.start_get_tasks)
                this.import_timer.start()
            }

            // execute the iteration
            this.running_iteration = true
            this._start_get_tasks()
            this.running_iteration = false
            this.cancellation_point()

            // execute eventual urgent iteration
            // NOTE: this way, if (the iteration fails, the whole periodic import
            //      cycle fails.
            if (this.urgent_iteration) {
                this.urgent_iteration = false
                this.start_get_tasks()
            }
        } else {
            this.urgent_iteration = true
        }
    }


    _start_get_tasks()
    {
        /*
        This function executes an imports and schedules the next
        */
        this.cancellation_point()
        BackendSignals().backend_sync_started(this.get_id())
        this.do_periodic_import()
        BackendSignals().backend_sync_ended(this.get_id())
    }


    quit(disable=false)
    {
        /*
        Called when GTG quits or disconnects the backend.
        */
        // super(PeriodicImportBackend, this).quit(disable)
        try {
            this.import_timer.cancel()
        } catch (Exception) {
            pass
        }
        try {
            this.import_timer.join()
        } catch (Exception) {
            pass
        }
    }
}