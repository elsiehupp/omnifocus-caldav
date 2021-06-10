import { BaseElement, ValuedBaseElement } from "./BaseElement"
import { NameSpace } from "../lib/NameSpace"


// Operations
export class Propfind extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "propfind")
}


export class PropertyUpdate extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "propertyupdate")
}


export class Mkcol extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "mkcol")
}

export class SyncCollection extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "sync-collection")
}

// Filters

// Conditions
export class SyncToken extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "sync-token");
}

export class SyncLevel extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "sync-level")
}

// Components / Data


export class Prop extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "prop")
}


export class Collection extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "collection")
}


export class Set extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "set")
}


// Properties
export class ResourceType extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "resourcetype")
}


export class DisplayName extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("D", "displayname")
}


export class GetEtag extends ValuedBaseElement
{
    tag:NameSpace = new NameSpace("D", "getetag")
}

export class Href extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "href")
}

export class SupportedReportSet extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "supported-report-set")
}

export class Response extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "response")
}


export class Status extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "status")
}

export class PropStat extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "propstat")
}

export class MultiStatus extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "multistatus")
}

export class CurrentUserPrincipal extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "current-user-principal")
}

export class PrincipalCollectionSet extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "principal-collection-set")
}

export class Allprop extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "allprop")
}