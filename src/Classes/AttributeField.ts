import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"

export class AttributeField extends Field
{

    get_gtg(task: Task, namespace: string = undefined):string
    {
        return task.get_attribute(this.dav_name, namespace=namespace)
    }

    write_gtg(task: Task, value, namespace: string = undefined)
    {
        task.set_attribute(this.dav_name, value, namespace=namespace);
    }

    set_gtg(todo: Todo, task: Task,
                namespace: string = undefined):void
    {
        var value = this.get_dav(todo);
        if ((this._is_value_allowed(value)) {
            this.write_gtg(task, value, namespace);
        }
    }
}