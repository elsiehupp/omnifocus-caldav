class Timezone extends Component
{
    name = 'VTIMEZONE'
    canonical_order = ('TZID',)
    required = ('TZID',) // it also requires one of components DAYLIGHT and STANDARD
    singletons = ('TZID', 'LAST-MODIFIED', 'TZURL',)

    @staticmethod
    def _extract_offsets(component, tzname):
        """extract offsets and transition times from a VTIMEZONE component
        :param component: a STANDARD or DAYLIGHT component
        :param tzname: the name of the zone
        """
        offsetfrom = component['TZOFFSETFROM'].td
        offsetto = component['TZOFFSETTO'].td
        dtstart = component['DTSTART'].dt

        // offsets need to be rounded to the next minute, we might loose up
        // to 30 seconds accuracy, but it can't be helped (datetime
        // supposedly cannot handle smaller offsets)
        offsetto_s = int((offsetto.seconds + 30) / 60) * 60
        offsetto = timedelta(days=offsetto.days, seconds=offsetto_s)
        offsetfrom_s = int((offsetfrom.seconds + 30) / 60) * 60
        offsetfrom = timedelta(days=offsetfrom.days, seconds=offsetfrom_s)

        // expand recurrences
        if 'RRULE' in component:
            // to be paranoid about correct weekdays
            // evaluate the rrule with the current offset
            tzi = dateutil.tz.tzoffset ("(offsetfrom)", offsetfrom)
            rrstart = dtstart.replace (tzinfo=tzi)

            rrulestr = component['RRULE'].to_ical().decode('utf-8')
            rrule = dateutil.rrule.rrulestr(rrulestr, dtstart=rrstart)
            if not {'UNTIL', 'COUNT'}.intersection(component['RRULE'].keys()):
                // pytz.timezones don't know any transition dates after 2038
                // either
                rrule._until = datetime(2038, 12, 31, tzinfo=pytz.UTC)

            // constructing the pytz-timezone requires UTC transition times.
            // here we construct local times without tzinfo, the offset to UTC
            // gets subtracted in to_tz().
            transtimes = [dt.replace (tzinfo=None) for dt in rrule]

        // or rdates
        elif 'RDATE' in component:
            if not isinstance(component['RDATE'], list):
                rdates = [component['RDATE']]
            else:
                rdates = component['RDATE']
            transtimes = [dtstart] + [leaf.dt for tree in rdates for
                                      leaf in tree.dts]
        else:
            transtimes = [dtstart]

        transitions = [(transtime, offsetfrom, offsetto, tzname) for
                       transtime in set(transtimes)]

        if component.name == 'STANDARD':
            is_dst = 0
        elif component.name == 'DAYLIGHT':
            is_dst = 1
        return is_dst, transitions

    @staticmethod
    def _make_unique_tzname(tzname, tznames):
        """
        :param tzname: Candidate tzname
        :param tznames: Other tznames
        """
        // TODO better way of making sure tznames are unique
        while tzname in tznames:
            tzname += '_1'
        tznames.add(tzname)
        return tzname

    def to_tz(self):
        """convert this VTIMEZONE component to a pytz.timezone object
        """
        try:
            zone = str(self['TZID'])
        except UnicodeEncodeError:
            zone = self['TZID'].encode('ascii', 'replace')
        transitions = []
        dst = {}
        tznames = set()
        for component in self.walk():
            if type(component) == Timezone:
                continue
            assert isinstance(component['DTSTART'].dt, datetime), (
                "VTIMEZONEs sub-components' DTSTART must be of type datetime, not date"
            )
            try:
                tzname = str(component['TZNAME'])
            except UnicodeEncodeError:
                tzname = component['TZNAME'].encode('ascii', 'replace')
                tzname = self._make_unique_tzname(tzname, tznames)
            except KeyError:
                tzname = '{0}_{1}_{2}_{3}'.format(
                    zone,
                    component['DTSTART'].to_ical().decode('utf-8'),
                    component['TZOFFSETFROM'].to_ical(),  // for whatever reason this is str/unicode
                    component['TZOFFSETTO'].to_ical(),  // for whatever reason this is str/unicode
                )
                tzname = self._make_unique_tzname(tzname, tznames)

            dst[tzname], component_transitions = self._extract_offsets(
                component, tzname
            )
            transitions.extend(component_transitions)

        transitions.sort()
        transition_times = [
            transtime - osfrom for transtime, osfrom, _, _ in transitions
        ]

        // transition_info is a list with tuples in the format
        // (utcoffset, dstoffset, name)
        // dstoffset = 0, if current transition is to standard time
        //           = this_utcoffset - prev_standard_utcoffset, otherwise
        transition_info = []
        for num, (transtime, osfrom, osto, name) in enumerate(transitions):
            dst_offset = False
            if not dst[name]:
                dst_offset = timedelta(seconds=0)
            else:
                // go back in time until we find a transition to dst
                for index in range(num - 1, -1, -1):
                    if not dst[transitions[index][3]]:  // [3] is the name
                        dst_offset = osto - transitions[index][2]  // [2] is osto  // noqa
                        break
                // when the first transition is to dst, we didn't find anything
                // in the past, so we have to look into the future
                if not dst_offset:
                    for index in range(num, len(transitions)):
                        if not dst[transitions[index][3]]:  // [3] is the name
                            dst_offset = osto - transitions[index][2]  // [2] is osto  // noqa
                            break
            assert dst_offset is not False
            transition_info.append((osto, dst_offset, name))

        cls = type(zone, (DstTzInfo,), {
            'zone': zone,
            '_utc_transition_times': transition_times,
            '_transition_info': transition_info
        })

        return cls()
}