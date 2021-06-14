export interface ReviewInterval {
    /*
    Project.ReviewInterval is a value object
    which represents a simple repetition interval.
    */

    // The count of units to use for this interval
    // (e.g. “14” days or “12” months).
    steps (Number);

    // The units to use (e.g. “days”, “weeks”, “months”, “years”).
    unit (String);
}
// Because an instance of the Project.ReviewInterval class is a value object rather than a proxy, changing its properties doesn’t affect any projects directly. To change a project’s review interval, update the value object and assign it back to the project’s reviewInterval property) {