import { Dictionary } from "typescript-collections"
import { Exception } from ""

// from collections import defaultdict
// import logging

// try {
//     import os
//     /// one of DEBUG_PDB, DEBUG, DEVELOPMENT, PRODUCTION
//     debugmode = os.environ['PYTHON_CALDAV_DEBUGMODE']
// } catch {
//     /// TODO: the default value here should be set to PRODUCTION prior to release
//     debugmode = 'DEVELOPMENT'

// log = logging.getLogger('caldav')
// if (debugmode.startsWith('DEBUG')) {
//     log.setLevel(logging.DEBUG)
// } else {
//     log.setLevel(logging.WARNING)
// }

// assert_(condition)
// {
//     try {
//         assert(condition)
//     } catch (AssertionError) {
//         if (debugmode == 'PRODUCTION') {
//             console.log("Deviation from expectations found.  %s" % ERR_FRAGMENT, exc_info=true)
//         } else if (debugmode == 'DEBUG_PDB') {//             console.log("Deviation from expectations found.  Dropping into debugger")
//             import pdb; pdb.set_trace()
//         } else {
//             raise
//         }
//     }
// }

const ERR_FRAGMENT:string = "Please raise an issue at https://github.com/python-caldav/caldav/issues or reach out to t-caldav@tobixen.no, include this error and the traceback and tell what server you are using"

export class AuthorizationError extends Exception
{
    /*
    The client encountered an HTTP 403 error and is passing it on
    to the user. The url property will contain the url in question,
    the reason property will contain the excuse the server sent.
    */
    url = null
    reason = "PHP at work[tm]"

    __str__()
    {
        return `AuthorizationError at '${this.url}', reason '${this.reason}'`;
    }
}


export class DavError extends Exception
{
    // pass
}


export class PropsetError extends DavError
{
    // pass
}

export class ProppatchError extends DavError
{
    // pass
}


export class PropfindError extends DavError
{
    // pass
}


export class ReportError extends DavError
{
    // pass
}


export class MkcolError extends DavError
{
    // pass
}


export class MkcalendarError extends DavError
{
    // pass
}


export class PutError extends DavError
{
    // pass
}


export class DeleteError extends DavError
{
    // pass
}


export class NotFoundError extends DavError
{
    pass
}

export class ConsistencyError extends DavError
{
    pass
}

export class ReponseError extends DavError
{
    pass
}

const exception_by_method = new Dictionary(lambda: DavError)
for (var method in ['delete', 'put', 'mkcalendar', 'mkcol', 'report', 'propset',
               'propfind', 'proppatch']) {
    exception_by_method[method] =
        locals()[method[0].toUpperCase() + method[1:] + 'Error']
               }
