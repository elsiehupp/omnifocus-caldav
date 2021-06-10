import { AttributeField } from "./AttributeField"
import { Todo } from "../CalDav/Todo"
import { Integer } from "./Integer"
import { Task } from "./omnifocus"

export class Sequence extends AttributeField
{
    get_gtg(task: Task, namespace: string = undefined)
    {
        try {
            return new Integer(this.get_gtg(task, namespace) || '0');
        } catch (ValueError) {
            return 0;
        }
    }

    get_dav(todo=undefined, vtodo=undefined)
    {
        try {
            return new Integer(this.get_dav(todo, vtodo) || 0);
        } catch (ValueError) {
            return 0;
        }
    }

    set_dav(task: Task, vtodo: Todo, namespace: string)
    {
        try {
            this.write_dav(vtodo, String(this.get_gtg(task, namespace)));
        } catch (ValueError) {
            this.write_dav(vtodo, '1');
        }
    }
}