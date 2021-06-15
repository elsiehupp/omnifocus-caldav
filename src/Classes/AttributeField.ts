import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"

export class AttributeField extends Field
{

    get_gtg(task: Task, namespace: string = undefined):any
    {
        switch (namespace) {

        case "tid":
            return;
        case "remote_ids":
            return;
        case "content":
            return task.note;
        case "title":
            return task.name
        // gtg statuses are: Active - Done - Dismiss - Note
        case "status":
            return;
        case "added_date":
            return;
        case "closed_date":
            return;
        case "due_date":
            return task.dueDate;
        case "start_date":
            return task.deferDate;
        case "tags":
            return task.tags;
        case "attributes":
            return;
        case "recurring_term = None":
            return task.repetitionRule;
        case "recurring_updated_date":
            return;
        default:
            return
        }
    }

    write_gtg(task: Task, value, namespace: string = undefined)
    {
        switch (namespace) {

        case "tid":
            return;
        case "remote_ids":
            return;
        case "content":
            task.note = value;
            return;
        case "title":
            task.name = value;
            return;
        // gtg statuses are: Active - Done - Dismiss - Note
        case "status":
            return;
        case "added_date":
            return;
        case "closed_date":
            return;
        case "due_date":
            task.dueDate = value;
            return;
        case "start_date":
            task.deferDate = value;
            return;
        case "tags":
            task.tags = value;
            return;
        case "attributes":
            return;
        case "recurring_term = None":
            task.repetitionRule = value;
            return;
        case "recurring_updated_date":
            return;
        default:
            return;
        }
    }

    set_gtg(todo: Todo, task: Task,
                namespace: string = undefined):void
    {
        var value = this.get_dav(todo);
        if (this._is_value_allowed(value)) {
            this.write_gtg(task, value, namespace);
        }
    }
}