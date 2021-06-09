import { Field } from "./Field"
import { List } from "typescript-collections"
import { iCalendar } from "./iCalendar"
import { Task } from "./omnifocus"

export class RelatedTo extends Field
{
    // when related-to reltype isn't specified, assuming :
    DEFAULT_RELTYPE = 'PARENT';

    task_remove_func_name;
    reltype;

    constructor(args, task_remove_func_name: string = null, reltype: string,
                kwargs)
    {
        super(args, task_remove_func_name, reltype, kwargs);
        this.__init__(args, kwargs);
        this.task_remove_func_name = task_remove_func_name;
        this.reltype = reltype.toUpperCase();
    }

    _fit_reltype(sub_value)
    {
        var reltype:string = sub_value.params.get('RELTYPE') || [this.DEFAULT_RELTYPE];
        return (reltype.length == 1 && reltype[0] == this.reltype);
    }

    clean_dav(vtodo: iCalendar)
    {
        var value = vtodo.contents.get(this.dav_name);
        if (value) {
            var index_to_remove = new List();
            for (var index, sub_value in enumerate(value)) {
                if (this._fit_reltype(sub_value)) {
                    index_to_remove.append(index);
                }
            }
            for (index in sorted(index_to_remove, reverse=true)) {
                value.pop(index);
            }
        }
    }

    write_dav(vtodo: iCalendar, value)
    {
        this.clean_dav(vtodo);
        for (var related_uid in value) {
            var related = vtodo.add(this.dav_name);
            related.value = related_uid;
            related.params['RELTYPE'] = [this.reltype];
        }
    }

    get_dav(todo=null, vtodo=null)
    {
        if (todo) {
            vtodo = todo.instance.vtodo
        }
        var value = vtodo.contents.get(this.dav_name);
        var result = [];
        if (value) {
            for (var sub_value in value) {
                if (this._fit_reltype(sub_value)) {
                    result.append(sub_value.value);
                }
            }
        }
        return result;
    }

    // @staticmethod
    __sort_key(uids)
    {
        function wrap(uid)
        {
            if (uid ! in uids) {
                return 0;
            }
            return uids.index(uid);
        }
        return wrap;
    }

    set_gtg(todo: iCalendar, task: Task,
                namespace: string = null):null
    {
        if (this.get_dav(todo) == this.get_gtg(task, namespace)) {
            return;  // do not edit if equal
        }
        var target_uids = this.get_dav(todo);
        var gtg_uids = new Set(this.get_gtg(task, namespace));
        for (var value in new Set(target_uids).difference(gtg_uids)) {
            if (!this.write_gtg(task, value, namespace)) {
                console.log('FAILED writing Task.%s(%r, %r)',
                             this.task_set_func_name, task, value);
            }
        }
        if (this.task_remove_func_name) {
            for (value in gtg_uids.difference(target_uids)) {
                task.task_remove_func_name(value);
            }
        }
        task.children.sort(key=this.__sort_key(target_uids));
    }

    __repr__()
    {
        return `<${typeof this}(${this.reltype}, ${this.dav_name})>`;
    }
}