import { DateField } from "./DateField"
import { Accuracy } from "./Accuracy"

export class UTCDateTimeField extends DateField
{
    // @staticmethod
    _get_dt_for_dav_writing(value)
    {
        if (value instanceof Date) {
            if (value.accuracy == Accuracy.timezone) {
                return ['', value.dt_value];
            }
            if (value.accuracy == Accuracy.fuzzy) {
                return [String(value), value.dt_by_accuracy(Accuracy.timezone)];
            }
        } else {
            value = Date(value);
        }
        return ['', value.dt_by_accuracy(Accuracy.timezone)];
    }
}