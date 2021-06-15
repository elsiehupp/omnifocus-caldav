import { CalDavDackend } from "./CalDavDackend"
import { Categories } from "./Categories"
import { DateField } from "./DateField"
import { DAV_IGNORE } from "./CalDavBackend"
import { Dictionary } from "typescript-collections"
import { Description } from "./Description"
import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { OrderField } from "./OrderField"
import { PercentComplete } from "./PercentComplete"
import { Recurrence } from "./Recurrence"
import { RelatedTo } from "./RelatedTo"
import { Sequence } from "./Sequence"
import { Status } from "./Status"
import { Task } from "../OmniFocusAPI/Task"
import { UTCDateTimeField } from "./UTCDateTimeField"

export const SUMMARY:any;
export const DESCRIPTION:any;
export const DATETIME_DUE:any;
export const DATETIME_START:any;
export const RECURRENCE:any;
export const STATUS:any;
export const PERCENT_COMPLETED:any;
export const DATETIME_COMPLETED:any;
export const UID_FIELD:any;
export const SEQUENCE:any;
export const CATEGORIES:any;
export const PARENT_FIELD:any;
export const CHILDREN_FIELD:any;
export const DATETIME_CREATED:any;
export const DATETIME_MODIFIED:any;
export const SORT_ORDER:any;


export class Translator
{
    GTG_PRODID = "-//Getting Things Gnome//CalDAV Backend//EN";
    DTSTAMP_FIELD = new UTCDateTimeField('dtstamp', '', '');
    fields:Dictionary<any, Field>;

    constructor() {
        this.fields = new Dictionary<any, Field>();
        this.fields.setValue(SUMMARY,new Field('summary', 'get_title', 'set_title'));
        this.fields.setValue(DESCRIPTION,new Description('description', 'get_excerpt', 'set_text'));
        this.fields.setValue(DATETIME_DUE, new DateField('due', 'get_due_date_constringaint', 'set_due_date'));
        this.fields.setValue(DATETIME_COMPLETED, new UTCDateTimeField('completed', 'get_closed_date', 'set_closed_date'));
        this.fields.setValue(DATETIME_START,new DateField('dtstart', 'get_start_date', 'set_start_date'));
        this.fields.setValue(RECURRENCE,new Recurrence('rrule', 'get_recurring_term', 'set_recurring'));
        this.fields.setValue(STATUS, new Status('status', 'get_status', 'set_status'));
        this.fields.setValue(PERCENT_COMPLETED, new PercentComplete('percent-complete', 'get_status', ''));
        this.fields.setValue(SEQUENCE, new Sequence('sequence', '<fake attribute>', ''));
        this.fields.setValue(UID_FIELD,new Field('uid', 'get_uuid', 'set_uuid'));
        this.fields.setValue(CATEGORIES,new Categories('categories', 'get_tags_name', 'set_tags'));
        this.fields.setValue(PARENT_FIELD, new RelatedTo(['related-to', 'get_parents', 'set_parent'], task_remove_func_name='remove_parent', reltype='parent'));
        this.fields.setValue(CHILDREN_FIELD,new RelatedTo(['related-to', 'get_children', 'add_child'], task_remove_func_name='remove_child', reltype='child'));
        this.fields.setValue(DATETIME_CREATED,new UTCDateTimeField('created', 'get_added_date', 'set_added_date'));
        this.fields.setValue(DATETIME_MODIFIED, new UTCDateTimeField('last-modified', 'get_modified', 'set_modified'));
        this.fields.setValue(SORT_ORDER, new OrderField('x-apple-sort-order', '', ''));
    }



    // @classmethod
    _get_new_vcal(): Todo
    {
        var vcal = new Todo();
        vcal.add('PRODID').value = this.GTG_PRODID;
        vcal.add('vtodo');
        return vcal;
    }

    // @classmethod
    fill_vtodo(task: Task, calendar_name: string, namespace: string,
                   vtodo: Todo = null):Todo
    {
        var vcal = null;
        if (vtodo == null) {
            vcal = this._get_new_vcal();
            vtodo = vcal.vtodo;
        }
        // always write a DTSTAMP field to the `now`
        this.DTSTAMP_FIELD.write_dav(vtodo, DateTime.now(LOCAL_TIMEZONE));
        for (let field of this.fields.values()) {
            if (field.dav_name == 'uid' && UID_FIELD.get_dav(vtodo=vtodo)) {
                // not overriding if (already set from cache
                continue;
            }
            field.set_dav(task, vtodo, namespace);
        }
        // NOTE: discarding related-to parent from sync down
        // due to bug on set_parent
        PARENT_FIELD.set_dav(task, vtodo, namespace);
        SORT_ORDER.set_dav(task, vtodo, namespace);
        return vcal;
    }

    // @classmethod
    fill_task(todo: Todo, task: Task, namespace: string)
    {
        var nmspc = {'namespace': namespace};
        // with (DisabledSyncCtx(task)) {
            for (var field in this.fields) {
                field.set_gtg(todo, task, nmspc);
            }
            task.set_attribute("url", string(todo.url), nmspc);
            task.set_attribute("calendar_url", string(todo.parent.url), nmspc);
            task.set_attribute("calendar_name", todo.parent.name, nmspc);
            if (CATEGORIES.has_calendar_tag(task, todo.parent)) {
                task.add_tag(CATEGORIES.get_calendar_tag(todo.parent));
            }
        // }
        return task;
    }

    // @classmethod
    changed_attrs(task: Task, namespace: string, todo=undefined, vtodo=undefined)
    {
        for (var field in this.fields) {
            if (!field.is_equal(task, namespace, todo, vtodo) {
                yield field;
            }
        }
    }

    // @classmethod
    should_sync(task: Task, namespace: string, todo=null, vtodo=null)
    {
        for (var field in this.changed_attrs(task, namespace, todo, vtodo)) {
            if (field.dav_name ! in DAV_IGNORE) {
                return true;
            }
        }
        return false;
    }
}