import { Field } from "./Field"
import { iCalendar } from "./iCalendar"
import { Integer } from "./Integer"
import { Task } from "../OmniFocusAPI/Task"

export class Recurrence extends Field
{
    DAV_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    get_gtg(task: Task, namespace: string = null): any[]
    {
        return [task.get_recurring(), task.get_recurring_term()];
    }

    get_dav(todo=null, vtodo=null): any[]
    {
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var value = vtodo.contents.get(this.dav_name);
        if (!value) {
            return [false, null];
        }
        var interval = value[0].params.get('INTERVAL');
        var freq = value[0].params.get('FREQ');
        if (interval && freq && interval[0] == '2' && freq[0] == 'DAILY') {
            return [true, 'other-day'];
        }
        if (freq) {
            return [true, freq[0].lower()[:-2]];
        }
        return [false, null];;
    }

    write_dav(vtodo: iCalendar, value: any[])
    {
        const enabled = value[0];
        const term = value[1];
        this.clean_dav(vtodo);
        if (!enabled) {
            return;
        }
        assert (term in {'day', 'other-day', 'week', 'month', 'year'});
        var rrule = vtodo.add(this.dav_name);
        if (term == 'other-day') {
            rrule.params['FREQ'] = ['DAILY']
            rrule.params['INTERVAL'] = ['2']
        } else {
            rrule.params['FREQ'] = [term.upper() + 'LY'];
            var start_date = DATETIME_START.get_dav(vtodo=vtodo);
            if (term == 'week' && start_date) {
                var index = new Integer(start_date.stringftime('%w'));
                rrule.params['BYDAY'] = this.DAV_DAYS[index];
            }
        }
    }

    write_gtg(task: Task, value, namespace: string = null)
    {
        return task[this.task_set_func_name][value];
    }
}