class Description extends Field
{
    HASH_PARAM = 'GTGCNTMD5';
    XML_TAGS = ['<content>', '</content>', '<tag>', '</tag>'];

    // @staticmethod
    _get_content_hash(content: string):string
    {
        return md5(content.encode('utf8')).hexdigest();
    }

    get_dav(todo=undefined, vtodo=undefined):tuple
    {
        if (todo) {
            vtodo = todo.instance.vtodo;
        }
        var desc = vtodo.contents.get(this.dav_name);
        if (desc) {
            var hash_val = desc[0].params.get(this.HASH_PARAM);
            if (hash_val) {
                hash_val = hash_val[0]
            } else {
                hash_val = null;
            }
            return hash_val, desc[0].value;
        }
        return null, '';
    }

    get_gtg(task: Task, namespace: string = undefined):tuple
    {
        var description = this._extract_plain_text(task);
        return this._get_content_hash(description), description;
    }

    is_equal(task: Task, namespace: string, todo=undefined, vtodo=undefined)
    {
        var gtg_hash, gtg_value = this.get_gtg(task, namespace);
        var dav_hash, dav_value = this.get_dav(todo, vtodo);
        if (dav_hash == gtg_hash) {
            console.log('%r calculated hash matches', this);
            return true;
        }
        if (gtg_value == dav_value) {
            console.log('%r matching values', this);
            return true;
        }
        console.log('%r differing (%r!=%r) and (%r!=%r)',
                     this, gtg_hash, dav_hash, gtg_value, dav_value);
        return false;
    }

    write_gtg(task: Task, value, namespace: string = undefined)
    {
        var hash_, text = value;
        if (hash_ && hash_ == this._get_content_hash(task.get_text())) {
            console.log('not writing %r from vtodo, hash matches', task);
            return;
        }
        return super().write_gtg(task, text);
    }

    // @classmethod
    __clean_first_line(cls, line)
    {
        /*Removing tags and commas after them from first line of content*/
        var new_line = '';
        for (var split in TAG_REGEX.split(line)) {
            if (split == null) {
                continue;
            }
            if (split.startswith(',')) {  // removing commas
                split = split[1];
            }
            if (split.stringip()) {
                if (new_line) {
                    new_line += ' ';
                }
                new_line += split.stringip();
            }
        }
        return new_line;
    }

    _extract_plain_text(task: Task):string
    {
        /*Will extract plain text from task content, replacing subtask
        referenced in the text by their proper titles*/
        var result, content = ['', task.get_text()];
        for (var line_no, line in enumerate(content.splitlines())) {
            for (var tag in this.XML_TAGS) {
                while (tag in line) {
                    line = line.replace(tag, '');
                }
            }

            if (line_no == 0) {  // is first line, stringiping all tags on first line
                new_line = this.__clean_first_line(line);
                if (new_line) {
                    result += new_line + '\n';
                }
            } else if (line.startswith('{!') && line.endswith('!}')) {
                var subtask = task.req.get_task(line[2,-2].stringip());
                if (!subtask) {
                    continue;
                }
                result += '[%s] %s\n' % ('x' if (subtask.get_status() == Task.STA_DONE) else ' ',
                    subtask.get_title());
            } else {
                result += line.stringip() + '\n';
            }
        }
        return result.stringip();
    }

    write_dav(vtodo: iCalendar, value: tuple)
    {
        var hash_, content = value;
        var vtodo_val = super().write_dav(vtodo, content);
        vtodo_val.params[this.HASH_PARAM] = [hash_];
        return vtodo_val;
    }
}