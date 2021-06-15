class TimezoneStandard extends Component
{
    name = 'STANDARD'
    required = ('DTSTART', 'TZOFFSETTO', 'TZOFFSETFROM')
    singletons = ('DTSTART', 'TZOFFSETTO', 'TZOFFSETFROM',)
    multiple = ('COMMENT', 'RDATE', 'TZNAME', 'RRULE', 'EXDATE')
}