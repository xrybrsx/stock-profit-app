import { IsISO8601, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

// validate the date range
@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
  validate(startTime: string, args: ValidationArguments) {
    const endTime = (args.object as any).endTime;
    if (!startTime || !endTime) return true; // Let other validators handle missing values
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return start < end;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Start Time must be before End Time';
  }
}

@ValidatorConstraint({ name: 'moneyPrecision', async: false })
export class MoneyPrecisionValidator implements ValidatorConstraintInterface {
  validate(value: number) {
    if (typeof value !== 'number' || !isFinite(value)) return false;
    if (value < 0.01) return false; // minimum one cent
    // allow up to 2 decimal places (0.1, 0.01 allowed; 0.001 rejected)
    const cents = Math.round(value * 100);
    return Math.abs(value * 100 - cents) < 1e-8;
  }
  defaultMessage(): string {
    return 'Funds must be at least 0.01 and have at most two decimal places';
  }
}

export class ProfitDto {
  @IsISO8601({}, { message: 'Start Time must be a valid ISO 8601 timestamp' })
  @Validate(DateRangeValidator)
  startTime!: string;

  @IsISO8601({}, { message: 'End Time must be a valid ISO 8601 timestamp' })
  endTime!: string;

  @Validate(MoneyPrecisionValidator)
  funds!: number;
}