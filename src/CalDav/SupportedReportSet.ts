import { BaseElement } from "./BaseElement"
import { NameSpace } from "./NameSpace"

export class SupportedReportSet extends BaseElement
{
    tag:NameSpace = new NameSpace("D", "supported-report-set")
}