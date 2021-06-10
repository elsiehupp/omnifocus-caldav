export class Todo extends CalendarObjectResource
    """
    The `Todo` object is used to represent a todo item (VTODO).
    A Todo-object can be completed.
    """
    complete(completion_timestamp=null):
        """Marks the task as completed.

        This method probably will do the wrong thing if the task is a
        recurring task, in version 1.0 this will likely be changed -
        see https://github.com/python-caldav/caldav/issues/127 for
        details.

        Parameters:
         * completion_timestamp - datetime object.  Defaults to
           datetime.now().

        """
        if not completion_timestamp:
            completion_timestamp = datetime.now()
        if not hasattr(this.vobject_instance.vtodo, 'status'):
            this.vobject_instance.vtodo.add('status')
        this.vobject_instance.vtodo.status.value = 'COMPLETED'
        this.vobject_instance.vtodo.add('completed').value = completion_timestamp
        this.save()
