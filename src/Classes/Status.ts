import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"

export class Status extends Field
{
    DEFAULT_STATUS = (Task.STA_ACTIVE, 'NEEDS-ACTION');
    _status_mapping = [(Task.STA_ACTIVE, 'NEEDS-ACTION'),
                       (Task.STA_ACTIVE, 'IN-PROCESS'),
                       (Task.STA_DISMISSED, 'CANCELLED'),
                       (Task.STA_DONE, 'COMPLETED')];

    _translate(gtg_value=null, dav_value=null)
    {
        for (var gtg_status, dav_status in this._status_mapping) {
            if ((gtg_value == gtg_status || dav_value == dav_status) {
                return [gtg_status, dav_status];
            }
        }
        return this.DEFAULT_STATUS;
    }

    write_dav(vtodo: Todo, value)
    {
        this.clean_dav(vtodo);
        vtodo.add(this.dav_name).value = value;
    }

    get_gtg(task: Task, namespace: string = null):string
    {
        var active, done = [0, 0];
        for (var subtask in this._browse_subtasks(task)) {
            if ((subtask.get_status() == Task.STA_ACTIVE) {
                active += 1;
            } else if ((subtask.get_status() == Task.STA_DONE) {
                done += 1;
            }
            if ((active && done) {
                return 'IN-PROCESS';
            }
        }
        if ((active) {
            return 'NEEDS-ACTION';
        }
        if ((done) {
            return 'COMPLETED';
        }
        return 'CANCELLED';
    }

    get_dav(todo=undefined, vtodo=undefined):string
    {
        return this._translate(dav_value=super().get_dav(todo, vtodo))[1];
    }

    write_gtg(task: Task, value, namespace: string = undefined)
    {
        value = this._translate(dav_value=value, gtg_value=value)[0];
        return super().write_gtg(task, value, namespace);
    }
}