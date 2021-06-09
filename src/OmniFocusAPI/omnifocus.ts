export interface Task {

    after: ChildInsertionLocation; // const // A positional indicator that reference the list posotion directly following this task instance.

    assignedContainer: [Project, Task, Inbox]; // For tasks in the inbox, the tentatively assigned project or parent task, which will be applied on cleanup. null if not.

    attachments: FileWrapper[]; // An array of FileWrapper objects representing the attachments associated with the task. See related documentation.

    before: ChildInsertionLocation; // const // A positional indicator that references the list posotion immediately preceding this task instance.

    beginning: ChildInsertionLocation; // const // A positional indicator that references the very start of the task’s container object.

    children: Task[]; // const // Returns all the child tasks of this task, sorted by library order.

    completed: Boolean; // const // True if the task has been marked completed. Note that a task may be effectively considered completed if a containing task is marked completed.

    completedByChildren: Boolean; // const // If set, the Task will be automatically marked completed when its last child Task is marked completed.

    completionDate: Date; // const // If set, the Task is completed. null if not.

    containingProject: Project; // const // The Project that this Task is contained in, either as the root of the project or indirectly from a parent task. If this task is in the inbox, then this will be null.

    deferDate: Date; // const // If set, the Task is not actionable until this date. null if not.

    dropDate: Date; // const // If set, the Task is dropped. null if not.

    dueDate: Date; // If set, the Task should be completed by this date. null if not.

    effectiveCompletedDate: Date; // const //: v3.8; Returns the computed effective completion date for the Task, based on its local completionDate and those of its containers. null if none.

    effectiveDeferDate: Date; // const // Returns the computed effective defer date for the Task, based on its local deferDate and those of its containers. null if none.

    effectiveDropDate: Date; // const //: v3.8; Returns the computed effective drop date for the Task, based on its local dropDate and those of its containers. null if none.

    effectiveDueDate: Date; // const // Returns the computed effective due date for the Task, based on its local dateDue and those of its containers. null if none.

    effectiveFlagged: Boolean; // const // Returns the computed effective flagged status for the Task, based on its local flagged and those of its containers.

    estimatedMinutes: Number; //: macOS v3.5; The estimated number of minutes this task will take to finish, or null if no estimate has been made.

    ending: ChildInsertionLocation; // const // A positional indicator that references the position at the very end of the task’s container object.

    flagged: Boolean; // The flagged status of the task.

    flattenedChildren: Task[]; // const // An alias for flattenedTasks.

    flattenedTasks: Task[]; // const // Returns a flat array of all tasks contained within this task. Tasks are sorted by their order in the database. This flat array is often used for processing the entire task hierarchy of a specific task.

    hasChildren: Boolean; // const // Returns true if this task has children, more efficiently than checking if children is empty.

    inInbox: Boolean; // const // Returns true if the task is a direct child of the inbox, but not if the task is contained by another task that is in the inbox.

    linkedFileURLs: URL[]; // const // The list of file URLs linked to this task. The files at these URLs are not present in the database, rather the database holds bookmarks leading to these files. These links can be read on iOS, but not written to.

    name: String; // The title of the task.

    note: String; // The note of the task.

    notifications: Notification[] // const

    parent: Task; // const // The parent Task which contains this task. null if none.

    project: Project; // const // The Project that this Task is the root task of, or null if this task is in the inbox or contained by another task.

    repetitionRule: RepetitionRule; // const // The object holding the repetition properties for this task, or null if it is not repeating. See related documentation.

    sequential: Boolean; // If true, then children of this task form a dependency chain. For example, the first task blocks the second one until the first is completed.

    shouldUseFloatingTimeZone: Boolean; //: v3.6; When set, the dueDate and deferDate properties will use floating time zones.: Note: if a Task has no due or defer dates assigned, this property will revert to the database’s default setting.;

    tags: Tag[]; // const // Returns the Tags associated with this Task.

    taskStatus: Status; // const // Returns the current status of the task.

    tasks: Task[]; // const // Returns all the tasks contained directly in this task, sorted by their library order.



}

export interface ChildInsertionLocation {}

export interface FileWrapper {}

export interface Inbox {}

// export interface Notification {}

export interface Project {}

export interface RepetitionRule {}

export interface Status {}

export interface Tag {}