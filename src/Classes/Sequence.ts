import { AttributeField } from "./AttributeField"
import { iCalendar } from "./iCalendar"
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

    set_dav(task: Task, vtodo: iCalendar, namespace: string)
    {
        try {
            this.write_dav(vtodo, String(this.get_gtg(task, namespace)));
        } catch (ValueError) {
            this.write_dav(vtodo, '1');
        }
    }
}