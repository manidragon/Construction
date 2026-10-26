import { Response } from 'express';

export type WhatsAppDispatchStatus = 'Dispatched' | 'Skipped' | 'Failed';

export interface StandardApiResponse<T = any> {
  success: boolean;
  message: string;
  entity: string;
  whatsappStatus: WhatsAppDispatchStatus;
  errors: string[];
  data?: T;
}

export interface SendSuccessOptions<T = any> {
  message: string;
  entity: string;
  whatsappStatus?: WhatsAppDispatchStatus;
  data?: T;
  statusCode?: number;
}

export interface SendErrorOptions {
  message: string;
  entity: string;
  errors?: string[] | any;
  whatsappStatus?: WhatsAppDispatchStatus;
  statusCode?: number;
}

/**
 * Standardized AI & Controller Execution Feedback Helper
 * For every API action, form submission, or command executed, returns a unified JSON response:
 * {
 *   "success": true | false,
 *   "message": "Clear explanation of what was updated",
 *   "entity": "Task / Lead / Attendance / Dropdown / ...",
 *   "whatsappStatus": "Dispatched | Skipped | Failed",
 *   "errors": []
 * }
 */
export const sendSuccess = <T>(
  res: Response,
  {
    message,
    entity,
    whatsappStatus = 'Skipped',
    data,
    statusCode = 200,
  }: SendSuccessOptions<T>
): Response => {
  const payload: StandardApiResponse<T> = {
    success: true,
    message,
    entity,
    whatsappStatus,
    errors: [],
    ...(data !== undefined ? { data } : {}),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  {
    message,
    entity,
    errors = [],
    whatsappStatus = 'Skipped',
    statusCode = 400,
  }: SendErrorOptions
): Response => {
  const formattedErrors: string[] = Array.isArray(errors)
    ? errors.map((e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
    : [typeof errors === 'string' ? errors : errors?.message || 'Unknown error'];

  const payload: StandardApiResponse = {
    success: false,
    message,
    entity,
    whatsappStatus,
    errors: formattedErrors,
  };
  return res.status(statusCode).json(payload);
};
