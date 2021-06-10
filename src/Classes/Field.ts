import { assert } from "./Assert"
import { Task } from "../OmniFocusAPI/Task";
import { Todo } from "../CalDav/Todo";

export class Field
{
    /* Basic field representation.

    Allows to extract neutral values from GTG Task (attributes in integer or
    tags without '@' for example) and from vTodo (translated datetime).
    */

    dav_name: string;
    task_get_func_name: string;
    task_set_func_name: string;
    ignored_values: string[];

    constructor(dav_name: string,
                 task_get_func_name: string, task_set_func_name: string,
                 ignored_values = null)
    {
        this.dav_name = dav_name
        this.task_get_func_name = task_get_func_name;
        this.task_set_func_name = task_set_func_name;
        this.ignored_values = ignored_values || ['', 'null', null];
    }

    _is_value_allowed(value: string)
    {
        return value ! in this.ignored_values;
    }

    get_gtg(task: Task, namespace: string = null)
    {
        /*Extract value from GTG.core.task.Task according to specified getter*/
        return task[this.task_get_func_name];
    }

    clean_dav(vtodo: Todo):void
    {
        /*Will remove existing conflicting value from vTodo object*/
        vtodo.contents.pop(this.dav_name, null);
    }

    write_dav(vtodo: Todo, value)
    {
        /*will clean and write new value to vtodo object*/
        this.clean_dav(vtodo);
        var vtodo_val = vtodo.add(this.dav_name);
        vtodo_val.value = value;
        return vtodo_val;
    }

    set_dav(task: Task, vtodo: Todo, namespace: string)
    {
        /*Will extract value from GTG.core.task.Task and set it to vTodo*/
        var value = this.get_gtg(task, namespace);
        if (this._is_value_allowed(value)) {
            this.write_dav(vtodo, value);
        } else {
            this.clean_dav(vtodo);
        }
    }

    get_dav(todo=null, vtodo=null)
    {
        /*Extract value from vTodo according to specified dav key name*/
        if (todo) {
            vtodo = todo.instance.vtodo
        }
        var value = vtodo.contents.get(this.dav_name)
        if (value) {
            return value[0].value;
        }
    }

    write_gtg(task: Task, value, namespace: string = null)
    {
        /*Will write new value to GTG.core.task.Task*/
        return task[this.task_set_func_name][value]
    }

    set_gtg(todo: Todo, task: Task,
                namespace: string = null):void
    {
        /*Will extract value from vTodo and set it to GTG.core.task.Task*/
        if (!this.task_set_func_name) {
            return;
        }
        var value = this.get_dav(todo);
        if (this._is_value_allowed(value)) {
            this.write_gtg(task, value, namespace);
        }
    }

    is_equal(task: Task, namespace: string, todo=null, vtodo=null)
    {
        assert (todo != null || vtodo != null);
        var dav = this.get_dav(todo, vtodo);
        var gtg = this.get_gtg(task, namespace);
        if (dav != gtg) {
            console.log(`${this} has differing values (DAV) ${gtg}!=${dav} (GTG)`);
            return false;
        }
        return true
    }

    __repr__()
    {
        return `<${typeof this}(${this.dav_name})>`;
    }

    // @classmethod
    _browse_subtasks(task: Task)
    {
        yield task
        for (var child:Task in task.children) {
            yield from this._browse_subtasks(child);
        }
    }
}