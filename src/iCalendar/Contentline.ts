class Contentline(compat.unicode_type):
    """A content line is basically a string that can be folded and parsed into
    parts.
    """
    def __new__(cls, value, strict=False, encoding=DEFAULT_ENCODING):
        value = to_unicode(value, encoding=encoding)
        assert '\n' not in value, ('Content line can not contain unescaped '
                                    'new line characters.')
        self = super(Contentline, cls).__new__(cls, value)
        self.strict = strict
        return self

    @classmethod
    def from_parts(cls, name, params, values, sorted=True):
        """Turn a parts into a content line.
        """
        assert isinstance(params, Parameters)
        if hasattr(values, 'to_ical'):
            values = values.to_ical()
        else:
            values = vText(values).to_ical()
        // elif isinstance(values, basestring):
        //    values = escape_char(values)

        // TODO: after unicode only, remove this
        // Convert back to unicode, after to_ical encoded it.
        name = to_unicode(name)
        values = to_unicode(values)
        if params:
            params = to_unicode(params.to_ical(sorted=sorted))
            return cls('%s;%s:%s' % (name, params, values))
        return cls('%s:%s' % (name, values))

    def parts(self):
        """Split the content line up into (name, parameters, values) parts.
        """
        try:
            st = escape_string(self)
            name_split = None
            value_split = None
            in_quotes = False
            for i, ch in enumerate(st):
                if not in_quotes:
                    if ch in ':;' and not name_split:
                        name_split = i
                    if ch == ':' and not value_split:
                        value_split = i
                if ch == '"':
                    in_quotes = not in_quotes
            name = unescape_string(st[:name_split])
            if not name:
                raise ValueError('Key name is required')
            validate_token(name)
            if not name_split or name_split + 1 == value_split:
                raise ValueError('Invalid content line')
            params = Parameters.from_ical(st[name_split + 1: value_split],
                                          strict=self.strict)
            params = Parameters(
                (unescape_string(key), unescape_list_or_string(value))
                for key, value in compat.iteritems(params)
            )
            values = unescape_string(st[value_split + 1:])
            return (name, params, values)
        except ValueError as exc:
            raise ValueError(
                "Content line could not be parsed into parts: '%s': %s"
                % (self, exc)
            )

    @classmethod
    def from_ical(cls, ical, strict=False):
        """Unfold the content lines in an iCalendar into long content lines.
        """
        ical = to_unicode(ical)
        // a fold is carriage return followed by either a space or a tab
        return cls(uFOLD.sub('', ical), strict=strict)

    def to_ical(self):
        """Long content lines are folded so they are less than 75 characters
        wide.
        """
        return foldline(self).encode(DEFAULT_ENCODING)