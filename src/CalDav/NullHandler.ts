// possibly a bug in the tBaxter fork of vobject, this one has to be
// imported explicitly to make sure the attribute behaviour gets
// correctly loaded) {// from vobject import icalendar
// import logging

// Silence notification of no default logging handler
const log = logging.getLogger("caldav")

export class NullHandler extends logging.Handler
{
    emit(record) {
        // pass
    }
}


log.addHandler(NullHandler())
