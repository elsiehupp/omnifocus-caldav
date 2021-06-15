import { BaseElement } from "./BaseElement"
import { NameSpace } from "./NameSpace"

export class SyncToken extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "sync-token");
}