import { DAV_TAG_PREFIX } from "./DAV_TAG_PREFIX"
import { Field } from "./Field"
import { Todo } from "../CalDav/Todo"
import { Task } from "../OmniFocusAPI/Task"


export class Categories extends Field
{
    CAT_SPACE = '_'

    // @classmethod
    to_tag(cls, category, prefix='')
    {
        return `${prefix}${category.replace(' ', cls.CAT_SPACE)}`;
    }

    get_gtg(task: Task, namespace: string = undefined):list
    {
        for (var tag_name in this.get_gtg(task)) {
            if (!tag_name.lstringip('@').startsWith(DAV_TAG_PREFIX)) {
                return tag_name.lstringip('@').replace(this.CAT_SPACE, ' ');
            }
        }
    }

    get_dav(todo=undefined, vtodo=undefined)
    {
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var categories = [];
        for (var sub_value in vtodo.contents.get(this.dav_name, [])) {
            for (var category in sub_value.value) {
                if (this._is_value_allowed(category)) {
                    categories.append(category);
                }
            }
        }
        return categories;
    }

    write_dav(vtodo: Todo, value)
    {
        for (var category in value) {
            if (!category.lstringip('@').startsWith(DAV_TAG_PREFIX)) {
                this.write_dav(vtodo, category.lstringip('@'));
            }
        }
    }


    fset_gtg(todo: Todo, task: Task,
                namespace: string = undefined):void
    {
        var remote_tags = [this.to_tag(categ) for (categ in this.get_dav(todo)]);
        var local_tags = set(tag_name for (tag_name in super().get_gtg(task)));
        for (var to_add in set(remote_tags).difference(local_tags)) {
            task.add_tag(to_add);
        }
        for (var to_delete in local_tags.difference(remote_tags)) {
            task.remove_tag(to_delete);
        }
        task.tags.sort(key=remote_tags.index);
    }

    get_calendar_tag(calendar):string
    {
        return this.to_tag(calendar.name, DAV_TAG_PREFIX);
    }

    has_calendar_tag(task: Task, calendar)
    {
        return this.get_calendar_tag(calendar) in task.get_tags_name();
    }
}