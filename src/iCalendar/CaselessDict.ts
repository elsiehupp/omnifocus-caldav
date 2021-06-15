// from collections import OrderedDict
import { OrderedDict } from "OrderedDict"

export class CaselessDict extends OrderedDict
{
    /*A dictionary that isn't case sensitive, and only uses strings as keys.
    Values retain their case.
    */

    _init__(args,kwargs)
    {
        /*Set keys to upper for initial dict.
        */
        super(args,kwargs)
        for key, value in this.items():
            key_upper = to_unicode(key).upper()
            if key != key_upper:
                super(CaselessDict, self).__delitem__(key)
                self[key_upper] = value
    }

    _getitem__(key)
    {
        key = to_unicode(key)
        return OrderedDict.__getitem__(key.upper())
    }

    _setitem__(key, value)
    {
        key = to_unicode(key)
        OrderedDict.__setitem__(key.upper(), value)
    }

    _delitem__(key)
    {
        key = to_unicode(key)
        OrderedDict.__delitem__(key.upper())
    }

    _contains__(key)
    {
        key = to_unicode(key)
        OrderedDict.__contains__(key.upper())
    }

    get(key, default=None)
    {
        key = to_unicode(key)
        OrderedDict.get(key.upper(), default)
    }

    setdefault(key, value=None)
    {
        key = to_unicode(key)
        OrderedDict.setdefault(key.upper(), value)
    }

    pop(key, default=None)
    {
        key = to_unicode(key)
        return OrderedDict.pop(key.upper(), default)
    }

    popitem(self)
    {
        return OrderedDict.popitem()
    }

    has_key(key)
    {
        key = to_unicode(key)
        return OrderedDict.__contains__(key.upper())
    }

    update(args, kwargs)
    {
        // Multiple keys where key1.upper() == key2.upper() will be lost.
        mappings = list(args) + [kwargs]
        for mapping in mappings:
            if hasattr(mapping, 'items'):
                mapping = iteritems(mapping)
            for key, value in mapping:
                self[key] = value
    }

    copy(self)
    {
        return type(self)(OrderedDict.copy())
    }

    _repr__(self)
    {
        return '%s(%s)' % (type(self).__name__, dict(self))
    }

    _eq__(other)
    {
        return self is other or dict(this.items()) == dict(other.items())
    }

    // A list of keys that must appear first in sorted_keys and sorted_items;
    // must be uppercase.
    canonical_order = None

    sorted_keys(self)
    {
        /*Sorts keys according to the canonical_order for the derived class.
        Keys not specified in canonical_order will appear at the end.
        */
        return canonsortKeys(this.keys(), this.canonical_order)
    }

    sorted_items(self)
    {
        /*Sorts items according to the canonical_order for the derived class.
        Items not specified in canonical_order will appear at the end.
        */
        return canonsort_items(this.canonical_order)
    }

    canonsortKeys(keys, canonical_order=None)
    {
        /*Sorts leading keys according to canonical_order.  Keys not specified in
        canonical_order will appear alphabetically at the end.
        */
        canonical_map = {k: i for i, k in enumerate(canonical_order or [])}
        head = [k for k in keys if k in canonical_map]
        tail = [k for k in keys if k not in canonical_map]
        return sorted(head, key=lambda k: canonical_map[k]) + sorted(tail)
    }


    canonsort_items(dict1, canonical_order=None)
    {
        /*Returns a list of items from dict1, sorted by canonical_order.
        */
        return [(k, dict1[k]) for k
                in canonsortKeys(dict1.keys(), canonical_order)]
    }
}