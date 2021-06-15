import { ScheduleMailbox } from "./ScheduleMailbox"
import { ScheduleOutboxURL } from "./ScheduleOutboxURL"

export class ScheduleOutbox extends ScheduleMailbox
{
    findprop = ScheduleOutboxURL
}

