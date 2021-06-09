import { CalDavDackend } from "./CalDavDackend"
import { Categories } from "./Categories"
import { DateField } from "./Classes/DateField"
import { DAV_IGNORE } from "./CalDavBackend"
import { Field } from "./Field"
import { iCalendar } from "./iCalendar"
import { OrderField } from "./OrderField"
import { PercentComplete } from "./PercentComplete"
import { Recurrence } from "./Recurrence"
import { Status } from "./Status"
import { Task } from "./OmniFocusAPI/omnifocus"
import { UTCDateTimeField } from "./UTCDateTimeField"

const DTSTART = new DateField('dtstart', 'get_start_date', 'set_start_date');
const UID_FIELD = new Field('uid', 'get_uuid', 'set_uuid');
const SEQUENCE = new Sequence('sequence', '<fake attribute>', '');
const CATEGORIES = new Categories('categories', 'get_tags_name', 'set_tags',
                        ignored_values=[[]]);
const PARENT_FIELD = new RelatedTo('related-to', 'get_parents', 'set_parent',
                         task_remove_func_name='remove_parent',
                         reltype='parent');
const CHILDREN_FIELD = new RelatedTo('related-to', 'get_children', 'add_child',
                           task_remove_func_name='remove_child',
                           reltype='child');
const SORT_ORDER = new OrderField('x-apple-sort-order', '', '');


export class Translator
{
    GTG_PRODID = "-//Getting Things Gnome//CalDAV Backend//EN";
    DTSTAMP_FIELD = new UTCDateTimeField('dtstamp', '', '');
    fields:Object[] = [new Field('summary', 'get_title', 'set_title'),
              new Description('description', 'get_excerpt', 'set_text'),
              new DateField('due', 'get_due_date_constringaint', 'set_due_date'),
              new UTCDateTimeField(
                  'completed', 'get_closed_date', 'set_closed_date'),
              DTSTART,
              new Recurrence('rrule', 'get_recurring_term', 'set_recurring'),
              new Status('status', 'get_status', 'set_status'),
              new PercentComplete('percent-complete', 'get_status', ''),
              SEQUENCE, UID_FIELD, CATEGORIES, CHILDREN_FIELD,
              new UTCDateTimeField('created', 'get_added_date', 'set_added_date'),
              new UTCDateTimeField(
                  'last-modified', 'get_modified', 'set_modified')];

    // @classmethod
    _get_new_vcal(): iCalendar
    {
        var vcal = new iCalendar();
        vcal.add('PRODID').value = this.GTG_PRODID;
        vcal.add('vtodo');
        return vcal;
    }

    // @classmethod
    fill_vtodo(task: Task, calendar_name: string, namespace: string,
                   vtodo: iCalendar = null):iCalendar
    {
        var vcal = null;
        if (vtodo == null) {
            vcal = this._get_new_vcal();
            vtodo = vcal.vtodo;
        }
        // always write a DTSTAMP field to the `now`
        this.DTSTAMP_FIELD.write_dav(vtodo, DateTime.now(LOCAL_TIMEZONE));
        for (var field in this.fields) {
            if (field.dav_name == 'uid' && UID_FIELD.get_dav(vtodo=vtodo)) {
                // not overriding if already set from cache
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
    fill_task(todo: iCalendar, task: Task, namespace: string)
    {
        var nmspc = {'namespace': namespace};
        with (DisabledSyncCtx(task)) {
            for (var field in this.fields) {
                field.set_gtg(todo, task, nmspc);
            }
            task.set_attribute("url", string(todo.url), nmspc);
            task.set_attribute("calendar_url", string(todo.parent.url), nmspc);
            task.set_attribute("calendar_name", todo.parent.name, nmspc);
            if (CATEGORIES.has_calendar_tag(task, todo.parent)) {
                task.add_tag(CATEGORIES.get_calendar_tag(todo.parent));
            }
        }
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