class Alarm extends Component
{

    name = 'VALARM'
    // some properties MAY/MUST/MUST NOT appear depending on ACTION value
    required = ('ACTION', 'TRIGGER',)
    singletons = (
            'ATTACH', 'ACTION', 'DESCRIPTION', 'SUMMARY', 'TRIGGER',
            'DURATION', 'REPEAT',
            )
    inclusive = (('DURATION', 'REPEAT',), ('SUMMARY', 'ATTENDEE',))
    multiple = ('ATTENDEE', 'ATTACH')
}