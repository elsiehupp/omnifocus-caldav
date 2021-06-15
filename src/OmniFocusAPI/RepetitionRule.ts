export interface RepetitionRule {

    // Repeating Tasks

    // Omni Automation in OmniFocus provides the ability to set the repetition rules for a task. The repetitionRule property of the Task class is used to access and set any repeating parameters.

    // The RepetitionRule Class

    // A RepetitionRule describes a pattern of dates using a ICS formatted recurrence string: iCalendar.org) and a RepetitionMethod to describe how those dates are applied to a 

    // The properties of the RepetitionRule class:

    // The method used to create the repetition rule.
    // const
    method: RepetitionMethod

    // The ICS rule string used to create the repetition rule.
    // const
    ruleString: String
    
    // The instance functions of the RepetitionRule class:
    // Returns the first date described by the repetition rule that is after the given date.
    firstDateAfterDate(date: Date): Date
}

export interface RepetitionMethod {
    // The RepetitionMethod Class

    // XXXXX
    // const
    DeferUntilDate: RepetitionMethod

    // XXXXX
    // const
    DueDate: RepetitionMethod

    // RepetitionMethod r/o // XXXXX
    // const
    Fixed: RepetitionMethod

    // The task does not repeat.
    // const
    None: RepetitionMethod;

    // An array of all items of this enumeration.
    // Often used when creating action forms.
    // const
    all: RepetitionMethod[]


}