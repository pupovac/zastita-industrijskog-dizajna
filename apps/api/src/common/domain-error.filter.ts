import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError, DomainErrorKind } from '../domain/domain-error';

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  FORBIDDEN: HttpStatus.FORBIDDEN,
  INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
  CONFLICT: HttpStatus.CONFLICT,
  NOT_FOUND: HttpStatus.NOT_FOUND,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = STATUS_BY_KIND[error.kind];
    response.status(status).json({ statusCode: status, code: error.code, message: error.message });
  }
}
