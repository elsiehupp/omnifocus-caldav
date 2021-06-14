import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"

export class RelatedTo extends Field
{
    // when related-to reltype isn't specified, assuming ) {    DEFAULT_RELTYPE = 'PARENT';

    task_remove_func_name;
    reltype;

    constructor(args:string[], task_remove_func_name: string = null, reltype: string, wargs:any[])
    {
        super(args, task_remove_func_name, reltype, kwargs);
        this.constructor(args, kwargs);
        this.task_remove_func_name = task_remove_func_name;
        this.reltype = reltype.toUpperCase();
    }

    constructor(args, kwargs)
    {
        for (var kw in args) {
            this[kw] = kwargs[kw];
        }
    }

    _fit_reltype(sub_value)
    {
        var reltype:string = sub_value.params.get('RELTYPE') || [this.DEFAULT_RELTYPE];
        return (reltype.length == 1 && reltype[0] == this.reltype);
    }

    clean_dav(vtodo: Todo)
    {
        var value = vtodo.contents.get(this.dav_name);
        if ((value) {
            var index_to_remove = new Set();
            for (let [index, sub_value] of value) {
                if ((this._fit_reltype(sub_value)) {
                    index_to_remove.add(index);
                }
            }
            for (let index in index_to_remove) {
                value.pop(index);
            }
        }
    }

    write_dav(vtodo: Todo, value)
    {
        this.clean_dav(vtodo);
        for (var related_uid in value) {
            var related = vtodo.add(this.dav_name);
            related.value = related_uid;
            related.params['RELTYPE'] = [this.reltype];
        }
    }

    get_dav(todo=null, vtodo=null):Set<string>
    {
        if ((todo) {
            vtodo = todo.instance.vtodo
        }
        var value = new Set(vtodo.contents.get(this.dav_name));
        var result = new Set<string>();
        if ((value) {
            for (let sub_value of value) {
                if ((this._fit_reltype(sub_value)) {
                    result.add(sub_value.value);
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
            if ((uid ! in uids) {
                return 0;
            }
            return uids.index(uid);
        }
        return wrap;
    }

    set_gtg(todo: Todo, task: Task,
                namespace: string = null):null
    {
        if ((this.get_dav(todo) == this.get_gtg(task, namespace)) {
            return;  // do not edit if (equal
        }
        var target_uids = new Set(this.get_dav(todo));
        var gtg_uids = new Set(this.get_gtg(task, namespace));
        for (var value in new Set([...target_uids].filter(x => !gtg_uids.has(x)))) { // difference
            if ((!this.write_gtg(task, value, namespace)) {
                console.log(`FAILED writing Task.${this.task_set_func_name}(${task}, ${value})`);
            }
        }
        if ((this.task_remove_func_name) {
            for (value in new Set([...target_uids].filter(x => !gtg_uids.has(x)))) { // difference
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