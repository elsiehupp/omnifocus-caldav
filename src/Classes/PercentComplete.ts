import { Field } from "./Field"
import { Integer } from "./Integer"
import { Task } from "../OmniFocusAPI/Task"

export class PercentComplete extends Field
{
    get_gtg(task: Task, namespace: string = undefined):string
    {
        var total_cnt = 0;
        var done_cnt = 0;
        for (var subtask in this._browse_subtasks(task)) {
            if (subtask.get_status() != Task.STA_DISMISSED) {
                total_cnt += 1;
                if (subtask.get_status() == Task.STA_DONE) {
                    done_cnt += 1;
                }
            }
        }
        if (total_cnt) {
            return String(new Integer(100 * done_cnt / total_cnt));
        }
        return '0';
    }
}