import { IsISO8601, IsPositive, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

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
    return 'startTime must be before endTime';
  }
}

export class ProfitDto {
  @IsISO8601({}, { message: 'startTime must be a valid ISO 8601 timestamp' })
  @Validate(DateRangeValidator)
  startTime!: string;

  @IsISO8601({}, { message: 'endTime must be a valid ISO 8601 timestamp' })
  endTime!: string;

  @IsPositive({ message: 'funds must be a positive number' })
  funds!: number;
}