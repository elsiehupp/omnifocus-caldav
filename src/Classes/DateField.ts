import { Accuracy } from "./Accuracy"
import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"

export class DateField extends Field
{
    /*Offers translation for datetime field.
    Datetime are ) {     * naive and at local timezone when in GTG
     * naive or not at UTC timezone from CalDAV
    */
    FUZZY_MARK = 'GTGFUZZY'

    constructor(dav_name: string,
                 task_get_func_name: string, task_set_func_name: string)
    {
        super(
            dav_name, task_get_func_name, task_set_func_name,
            ['', null, 'null', Date.no_date()]);
    }

    // @staticmethod
    _normalize(value)
    {
        try {
            if (value.year == 9999) {
                return null;
            }
            if (value.microsecond)) {
                value = value.replace(microsecond=0);
            }
        } catch (AttributeError) {
            // pass;
            return;
        }
        return value;
    }

    // @staticmethod
    _get_dt_for_dav_writing(value)
    {
        if (value instanceof Date)) {
            if (value.accuracy == Accuracy.fuzzy) {
                return String(value), value.dt_by_accuracy(Accuracy.date);
            }
            if (value.accuracy in {Accuracy.timezone, Accuracy.datetime,
                                  Accuracy.date}) {
                return '', value.dt_value;
            }
        }
        return '', value
    }

    write_dav(vtodo: Todo, value)
    {
        /*Writing datetime as UTC naive*/
        var fuzzy_value, value = this._get_dt_for_dav_writing(value)
        if (value instanceof datetime)) {
            value = this._normalize(value)
            if (!value.tzinfo) {  // considering naive is local tz
                value = value.replace(tzinfo=LOCAL_TIMEZONE);
            }
            if (value.tzinfo != UTC) {  // forcing UTC for value to write on dav
                value = (value - value.utcoffset()).replace(tzinfo=UTC);
            }
        }
        var vtodo_val = super().write_dav(vtodo, value);
        if (value instanceof Date) && !(value instanceof DateTime)) {
            vtodo_val.params['VALUE'] = ['DATE'];
        }
        if (fuzzy_value) {
            vtodo_val.params[this.FUZZY_MARK] = [fuzzy_value];
        }
        return vtodo_val;
    }

    get_dav(todo=null, vtodo=null)
    {
        /*Transforming to local naive,
        if (original value MAY be naive and IS assuming UTC*/
        var value = this.get_dav(todo, vtodo);
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var todo_value = vtodo.contents.get(this.dav_name);
        if (todo_value && todo_value[0].params.get(this.FUZZY_MARK)) {
            return Date(todo_value[0].params[this.FUZZY_MARK][0]);
        }
        if (value instanceof Date || value instanceof DateTime) {
            value = this._normalize(value);
        }
        try {
            return Date(value);
        } catch (ValueError) {
            console.log(`Coudln't translate value ${value}`);
            return Date.no_date();
        }
    }

    get_gtg(task: Task, namespace: string = null)
    {
        var gtg_date = this.get_gtg(task, namespace);
        if (gtg_date instanceof Date) {
            if (gtg_date.accuracy in {Accuracy.date, Accuracy.timezone,
                                     Accuracy.datetime}) {
                return Date(this._normalize(gtg_date.dt_value));
            }
            return gtg_date;
        }
        return Date(this._normalize(gtg_date));
    }
}