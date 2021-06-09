import { TaskChildInsertionLocation } from "./TaskChildInsertionLocation"
import { FileWrapper } from "./FileWrapper"
import { Folder } from "./Folder"
import { Status } from "./Status"
import { Tag } from "./Tag"
import { TagArray } from "./TagArray"
import { Task } from "./Task"
import { TaskArray } from "./TaskArray"
import { RepetitionRule } from "./RepetitionRule"
import { ReviewInterval } from "./ReviewInterval"

export interface Project {
    /*
    A project is a task made up of multiple items, referred to in OmniFocus as actions. Projects are typically more complex than individual action items, and can include several related actions. The Projects perspective displays all of your projects in a list, which can be grouped into folders to create hierarchy.

    As with most scriptable objects, instances of the Project class have properties that define their use and purpose. Here are the properties of a project:
    */

    // Returns a location refering to position just after this project.
    // const
    after ():Folder.TaskChildInsertionLocation;

    // An array of FileWrapper objects representing the attachments associated with the Project’s root Task.
    attachments ():FileWrapper[];

    // Returns a location refering to position just before this project.
    // const
    before ():Folder.TaskChildInsertionLocation;

    // Returns a location referring to the position before the first Task directly contained in the root task of this project.
    // const
    beginning ():TaskChildInsertionLocation;

    // An alias for the tasks property.
    // const
    children ():TaskArray;

    // True if the project has been marked completed. Note that a project may be effectively considered completed if a containing project is marked completed.
    // const
    completed ():boolean;

    // If set, the project will be automatically marked completed when its last child Task is marked completed.
    completedByChildren ():boolean;

    // If set, the project is completed.
    // null if not
    completionDate ():Date;

    // If the property’s value is set to true, the project contains single tasks, and has no next task.
    containsSingletonActions ():boolean;

    // If the property’s value is set to true, this is the Project that inbox tasks that have enough information specified (as selected by the user’s preferences);will be filed into upon a clean-up.
    defaultSingletonActionHolder ():boolean;

    // If set, the project is not actionable until this date.
    // null if not
    deferDate ():Date;

    // If set, the project is dropped.
    // null if not
    dropDate ():Date;

    // If set, the project should be completed by this date.
    // null if not
    dueDate ():Date;

    // Returns the computed effective completion date for the Project, based on its local completionDate and those of its containers.
    // const
    // null if not
    effectiveCompletedDate ():Date;

    // Returns the computed effective defer date for the Project, based on its local deferDate and those of its containers.
    // const
    // null if not
    effectiveDeferDate ():Date;

    // Returns the computed effective drop date for the Project, based on its local dropDate and those of its containers.
    // const
    // null if not
    effectiveDropDate ():Date;

    // Returns the computed effective due date for the Project, based on its local dateDue and those of its containers.
    // const
    // null if not
    effectiveDueDate ():Date;

    // Returns the computed effective flagged status for the Project, based on its local flagged and those of its containers.
    // const
    effectiveFlagged ():boolean;

    // Returns a location referring to the position before the first Task directly contained in the root task of this project.
    // const
    ending ():TaskChildInsertionLocation;

    // The flagged status of the project.
    flagged ():boolean;

    // An alias for flattenedTasks.
    // const
    flattenedChildren ():TaskArray;

    // Returns a flat array of all tasks contained within this Project’s root Task. Tasks are sorted by their order in the database.
    // const
    flattenedTasks ():TaskArray;

    // Returns true if this Project’s root Task has children, more efficiently than checking if children is empty.
    // const
    hasChildren ():boolean;

    // No documentation available.
    // null if not
    lastReviewDate ():Date;

    // The name of the Project’s root task.
    name ():String;

    // No documentation available.
    // null if not
    nextReviewDate ():Date;

    // Returns the very next task that can be completed in the project, or null if there is none or the project contains singleton actions.
    // const
    // null if not
    nextTask ():Task;

    // An array of the notifications that are active for this project. (see related documentation);
    // const
    notifications ():Notification[];

    // The Folder (if any) containing this project.
    // const
    // null if not
    parentFolder ():Folder;

    // The object holding the repetition properties for this project, or null if it is not repeating. (see related documentation);
    // null if not
    repetitionRule ():RepetitionRule;

    // The object holding the review repetition properties for this project. See also lastReviewDate and nextReviewDate.
    // null if not
    reviewInterval ():ReviewInterval;

    // If true, then children of this project form a dependency chain. For example, the first task blocks the second one until the first is completed.
    sequential ():boolean;

    // When set, the dueDate and deferDate properties will use floating time zones. (Note: if a Project has no due or defer dates assigned, this property will revert to the database’s default setting.);
    shouldUseFloatingTimeZone ():boolean;

    // The current status of the project as a whole. This does not reflect the status of individual tasks within the project root task – a project may be marked with the Done status and its individual tasks will be left with the completion state they had, in case the status is changed again to Active.
    status ():Status;

    // Returns the Tags associated with this Project.
    // const
    tags ():TagArray;

    // Returns the root task of the project, which holds the bulk of the project information, as well as being the container for tasks within the project. IMPORTANT: if you wish to copy the project or move it to a location that requires tasks, you would use this task as the object to be copied or moved.
    // const
    task ():Task;

    // Returns all the tasks contained directly in this Project’s root Task, sorted by their library order.
    // const
    tasks ():Task[];

    // Returns the current status of the project.
    // const
    taskStatus ():Status;

    /*
    IMPORTANT: every project has an invisible “root” task
    (referenced using the task property listed above);
    that represents the parent project.

    Although the Project class has “task-like” properties,
    you may OPTIONALLY set the values of the “task-like”
    propertiesof a new or existing project, such as
    flagged, dueDate, effectiveDueDate, etc. by addressing
    the project’s root task.

    A project’s root task is referenced by appending the
    project’s task property to Project object reference
    in your script statements.
    */

    /*
    Project Types

    Projects are distinguished by their type, which varies based on how actions inside the project must be completed. Project type also affects how actions within the project show up according to the perspective’s View options.

        Sequential // Sequential projects have actions that need to be completed in a predetermined order; the first item must be finished before you can move on to the next. In a sequential project, there is only ever one action available at a time. (this is also, by definition, the project’s first available action).

        Parallel // Parallel projects consist of actions that can be completed in any order. In a parallel project, all incomplete actions are available, and the first available is the first one in the list.

        Single Actions // A single action list isn’t a project in the traditional sense; it’s a list of loosely-related items that aren’t interdependent (a shopping list is an example of this). In a single action list, all actions are considered both available and first available.

        TIP: // The difference between parallel and sequential projects is most visible when Projects View options are set to show only Available actions. (Actions beyond the first available action in a sequential project are blocked, and therefore hidden.);

    By default, new projects have parallel actions.

    To create a new project containing sequential actions, set the sequential property of the project or the project’s root task to true:
    */

    // Project Functions

    // Here are the functions that can be used with an instance of the Project class.

    // NOTE: many of these functions, such as addAttachment(…);and addNotification(…);replicate the same functions used by the Task class and are often applied to projects by calling them on the root task of the project. See the task documentation for detailed explanation and examples.

    taskNamed(name:String):Task;// Returns the first top-level Task in this project the given name, or null.

    appendStringToNote(stringToAppend:String):void;// Appends stringToAppend to the end of the Project’s root Task’s note.

    addAttachment(attachment:FileWrapper):void;// Adds attachment as an attachment to the Project’s root Task. If the attachment is large, consider using the addLinkedFileURL();function instead. Including large attachments in the database can degrade app performance. [see task attachment documentation]

    removeAttachmentAtIndex(index:Number):void;// Removes the attachment at index from this Project’s root Task’s attachments array. [see task attachment documentation]

    // markComplete(date:Date);→ (Task);// If the project is not completed, marks it as complete with the given completion date (or the current date if no date is specified). For repeating project, this makes a clone of the project and marks that clone as completed. In either case, the project that has been marked completed is returned.

    markIncomplete():void;// If the project is completed, marks it as incomplete.

    addNotification(info:Number):Notification; // Add a notification to the project from the specification in info. Supplying a Date creates an absolute notification that will fire at that date. Supplying a Double will create a due-relative notification. Specifying a due-relative notification when this project’s task’s effectiveDueDate is not set will result in an error. [see task notification documentation]

    addNotification(info:Date):Notification; // Add a notification to the project from the specification in info. Supplying a Date creates an absolute notification that will fire at that date. Supplying a Double will create a due-relative notification. Specifying a due-relative notification when this project’s task’s effectiveDueDate is not set will result in an error. [see task notification documentation]

    removeNotification(notification:Notification):void;// Remove an active notification for this project. Supplying a notification that is not in this task’s notifications array, or a notification that has task to something other than this project’s task results in an error. [see task notification documentation]

    addTag(tag:Tag):void;// Adds a Tag to this project, appending it to the end of the list of associated tags. If the tag is already present, no change is made. The moveTags();function of the Database class can be used to control the ordering of tags within the task.

    addTags(tags:Tag[]): void;// Adds multiple Tags to this project, appending them to the end of the list of associated tags. For any tags already associated with the Task, no change is made. The Database function moveTags can be used to control the ordering of tags within the task.

    removeTag(tag: Tag):void;// Removes a Tag from this project. If the tag is not associated with this project, no change is made.

    removeTags(tags:Tag[]):void;// Removes multiple Tags from this project. If a tag is not associated with this project, no change is made.

    clearTags():void;// Removes multiple Tags from this project. If a tag is not associated with this project, no change is made.

    addLinkedFileURL(url: URL): void;// Links a file URL to this task. In order to be considered a file URL, url must have the file scheme. That is, url must be of the form file://path-to-file. The file at url will not be added to database, rather a bookmark leading to it will be added. In order to add files to a task, use the addAttachment function. Linking files is especially useful for large files, as including large files in the database can degrade app performance. This function throws an error if invoked on iOS. [see task linked file documentation]

    removeLinkedFileWithURL(url: URL):void;// Removes the first link to a file with the given url. This removes the bookmark that leads to the file at url. If the file itself is present in the database, use the removeAttachmentAtIndex function instead. [see task linked file documentation]

// Identifying Specific Projects

// Projects can be identified by examining the value of their properties, with the most common example being the identification of projects by the value of their name property.

// The projectNamed(…);function of the Database class provides a mechanism for locating the first occurence of a project with a specified name, located at the top-level of the database or host container. If no matching projects are found, a value of null is returned.

    projectNamed(name:String):Project;// Returns the first top-level Project with the given name, or null.

    /*
    // Identifying Top-Level Projects
    projectNamed(]"My Top-Level Project");
    //--> [object Project: My Top-Level Project]
    projectNamed("Build");
    //--> null
    folderNamed("Master Project").projectNamed("Finish");
    //--> [object Project: Finish]
    */

// (01) Searching the top-level of the database library for a project specifed by name.

// (03);The search finds no matching projects and the function returns a value of: null

// (05);Using the folderNamed(…);function of the Database class to locate a project within a top-level folder.

// As shown in the script above, projects can be stored within folder hierarchies. The projectNamed(…);method searches the top-level library directory.

// To search througout the entire library folder hierarchies, you can use either the apply(…);function of the Library class, or by iterating the value of the flattenedProjects property of the Database class.
}
