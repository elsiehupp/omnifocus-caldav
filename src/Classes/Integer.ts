export class Integer extends Number
{
    constructor(num: number) {
        super()
        return Math.round(num) as Integer;
    }
}