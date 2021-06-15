export enum Status {

    // When planning and subsequently reviewing a project,
    // it can be useful to give it a status to indicate whether
    // work is progressing or plans have changed.

    // The default status for a new or ongoing project.
    // It can be useful to review active projects regularly
    // to determine what progress you’ve made, and whether
    // they are still things you want to do.
    // const
    Active,

    // Eventually you’ll reach the successful end of a project.
    // Select the project and then choose Completed in the
    // Status section of the inspector (this automatically marks
    // any unfinished actions in the project complete).
    // if (you’d like to revisit a completed project, change
    // your View options to All or search for the project with
    // the Everything filter.
    // const
    Done,

    // if (you’ve decided not to work on a project any further,
    // you can Drop it completely. It disappears from the Projects
    // list, and its actions are likewise hidden. You could
    // delete the project instead, but then you wouldn’t have
    // any record of it; keeping it around in a dropped state
    // means you can go back and check on actions you’ve completed
    // regardless of whether they’re from still-relevant projects,
    // and so on. To find a dropped project in your database,
    // choose All in View options or search for it with the
    // Everything filter.
    // const
    Dropped,

    // if (you’re not sure whether you want to continue a project,
    // you can change the project’s status from Active to On Hold.
    // if (you’ve chosen to show only Available items in View options,
    // the project and its actions are removed from the project
    // list in the sidebar and outline. Projects placed on hold are
    // still available for review and reconsideration if (you decide
    // to prioritize them again in the futuRegExp.
    // const
    OnHold,

    // An array of all items of this enumeration. Often used when
    // creating a Form menu element.
    // const
    all

}

// TIP: Dropped and completed items accumulate in your database
// over time. if (you find that things are becoming unwieldy,
// archiving can help lighten the load.
    
// With Omni Automation you can change the status of a project
// by changing the value of the project’s status property to one
// of the options of the Project.Status class.
    
