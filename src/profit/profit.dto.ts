import { IsISO8601, IsPositive, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

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

export class ProfitDto {
  @IsISO8601({}, { message: 'Start Time must be a valid ISO 8601 timestamp' })
  @Validate(DateRangeValidator)
  startTime!: string;

  @IsISO8601({}, { message: 'End Time must be a valid ISO 8601 timestamp' })
  endTime!: string;

  @IsPositive({ message: 'Funds must be a positive number' })
  funds!: number;
}