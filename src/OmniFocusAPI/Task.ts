import { ChildInsertionLocation } from "./ChildInsertionLocation"
import { FileWrapper } from "./FileWrapper"
import { Inbox } from "./Inbox"
import { Project } from "./Project"
import { RepetitionRule } from "./RepetitionRule"
import { Status } from "./Status"
import { Tag } from "./Tag"

export interface Task {
    // const // A positional indicator that reference the list posotion directly following this task instance.
    after: ChildInsertionLocation;

    // For tasks in the inbox, the tentatively assigned project or parent task, which will be applied on cleanup. null if not.
    assignedContainer: [Project, Task, Inbox];

    // An array of FileWrapper objects representing the attachments associated with the task. See related documentation.
    attachments: FileWrapper[];

    // const // A positional indicator that references the list posotion immediately preceding this task instance.
    before: ChildInsertionLocation;

    // const // A positional indicator that references the very start of the task’s container object.
    beginning: ChildInsertionLocation;

    // const // Returns all the child tasks of this task, sorted by library order.
    children: Task[];

    // const // True if the task has been marked completed. Note that a task may be effectively considered completed if a containing task is marked completed.
    completed: Boolean;

    // const // If set, the Task will be automatically marked completed when its last child Task is marked completed.
    completedByChildren: Boolean;

    // const // If set, the Task is completed. null if not.
    completionDate: Date;

    // const // The Project that this Task is contained in, either as the root of the project or indirectly from a parent task. If this task is in the inbox, then this will be null.
    containingProject: Project;

    // const // If set, the Task is not actionable until this date. null if not.
    deferDate: Date;

    // const // If set, the Task is dropped. null if not.
    dropDate: Date;

    // If set, the Task should be completed by this date. null if not.
    dueDate: Date;

    // const //: v3.8; Returns the computed effective completion date for the Task, based on its local completionDate and those of its containers. null if none.
    effectiveCompletedDate: Date;

    // const // Returns the computed effective defer date for the Task, based on its local deferDate and those of its containers. null if none.
    effectiveDeferDate: Date;

    // const //: v3.8; Returns the computed effective drop date for the Task, based on its local dropDate and those of its containers. null if none.
    effectiveDropDate: Date;

    // const // Returns the computed effective due date for the Task, based on its local dateDue and those of its containers. null if none.
    effectiveDueDate: Date;

    // const // Returns the computed effective flagged status for the Task, based on its local flagged and those of its containers.
    effectiveFlagged: Boolean;

    //: macOS v3.5; The estimated number of minutes this task will take to finish, or null if no estimate has been made.
    estimatedMinutes: Number;

    // const // A positional indicator that references the position at the very end of the task’s container object.
    ending: ChildInsertionLocation;

    // The flagged status of the task.
    flagged: Boolean;

    // const // An alias for flattenedTasks.
    flattenedChildren: Task[];

    // const // Returns a flat array of all tasks contained within this task. Tasks are sorted by their order in the database. This flat array is often used for processing the entire task hierarchy of a specific task.
    flattenedTasks: Task[];

    // const // Returns true if this task has children, more efficiently than checking if children is empty.
    hasChildren: Boolean;

    // const // Returns true if the task is a direct child of the inbox, but not if the task is contained by another task that is in the inbox.
    inInbox: Boolean;

    // const // The list of file URLs linked to this task. The files at these URLs are not present in the database, rather the database holds bookmarks leading to these files. These links can be read on iOS, but not written to.
    linkedFileURLs: URL[];

    // The title of the task.
    name: String;

    // The note of the task.
    note: String;

    // const
    notifications: Notification[]

    // const // The parent Task which contains this task. null if none.
    parent: Task;

    // const // The Project that this Task is the root task of, or null if this task is in the inbox or contained by another task.
    project: Project;

    // const // The object holding the repetition properties for this task, or null if it is not repeating. See related documentation.
    repetitionRule: RepetitionRule;

    // If true, then children of this task form a dependency chain. For example, the first task blocks the second one until the first is completed.
    sequential: Boolean;

    //: v3.6; When set, the dueDate and deferDate properties will use floating time zones.: Note: if a Task has no due or defer dates assigned, this property will revert to the database’s default setting.;
    shouldUseFloatingTimeZone: Boolean;

    // const // Returns the Tags associated with this Task.
    tags: Tag[];

    // const // Returns the current status of the task.
    taskStatus: Status;

    // const // Returns all the tasks contained directly in this task, sorted by their library order.
    tasks: Task[];



}