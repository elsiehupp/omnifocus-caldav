import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"
import { UID_FIELD } from "./UID_FIELD"

export class OrderField extends Field
{

    get_gtg(task: Task, namespace: string = null)
    {
        var parents = task.get_parents();
        if (!parents || !parents[0]) {
            return;
        }
        parent = task.req.get_task(parents[0]);
        var uid = UID_FIELD.get_gtg(task, namespace);
        return parent.get_child_index(uid);
    }

    set_dav(task: Task, vtodo: Todo, namespace: string):null
    {
        var parent_index = this.get_gtg(task, namespace);
        if (parent_index != null) {
            return this.write_dav(vtodo, String(parent_index));
        }
    }
}