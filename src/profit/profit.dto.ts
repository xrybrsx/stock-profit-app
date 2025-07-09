import { IsISO8601, IsPositive } from 'class-validator';

export class ProfitDto {
  @IsISO8601({}, { message: 'startTime must be a valid ISO 8601 timestamp' })
  startTime!: string;

  @IsISO8601({}, { message: 'endTime must be a valid ISO 8601 timestamp' })
  endTime!: string;

  @IsPositive({ message: 'funds must be a positive number' })
  funds!: number;
}