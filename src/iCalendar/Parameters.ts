export class Parameters(CaselessDict):
    """Parser and generator of Property parameter strings. It knows nothing of
    datatypes. Its main concern is textual structuRegExp.
    """

    def params(self):
        """In rfc2445 keys are called parameters, so this is to be consitent
        with the naming conventions.
        """
        return self.keys()

// TODO?
// Later, when I get more time... need to finish this off now. The last major
// thing missing.
//   def _encode(self, name, value, cond=1):
//       // internal, for conditional convertion of values.
//       if cond:
//           klass = types_factory.for_property(name)
//           return klass(value)
//       return value
/
//   def add(self, name, value, encode=0):
//       "Add a parameter value and optionally encode it."
//       if encode:
//           value = self._encode(name, value, encode)
//       self[name] = value
/
//   def decoded(self, name):
//       "returns a decoded value, or list of same"

    def to_ical(self, sorted=True):
        result = []
        items = list(self.items())
        if sorted:
            items.sort()

        for key, value in items:
            value = param_value(value)
            if isinstance(value, compat.unicode_type):
                value = value.encode(DEFAULT_ENCODING)
            // CaselessDict keys are always unicode
            key = key.upper().encode(DEFAULT_ENCODING)
            result.append(key + b'=' + value)
        return b';'.join(result)

    @classmethod
    def from_ical(cls, st, strict=False):
        """Parses the parameter format from ical text format."""

        // parse into strings
        result = cls()
        for param in q_split(st, ';'):
            try:
                key, val = q_split(param, '=', maxsplit=1)
                validate_token(key)
                // Property parameter values that are not in quoted
                // strings are case insensitive.
                vals = []
                for v in q_split(val, ','):
                    if v.startswith('"') and v.endswith('"'):
                        v = v.strip('"')
                        validate_param_value(v, quoted=True)
                        vals.append(v)
                    else:
                        validate_param_value(v, quoted=False)
                        if strict:
                            vals.append(v.upper())
                        else:
                            vals.append(v)
                if not vals:
                    result[key] = val
                else:
                    if len(vals) == 1:
                        result[key] = vals[0]
                    else:
                        result[key] = vals
            except ValueError as exc:
                raise ValueError('%r is not a valid parameter string: %s'
                                 % (param, exc))
        return result