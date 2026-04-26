export const LOCAL_APPLICATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export const LOCAL_APPLICATION_ID_RULE_DESCRIPTION =
  'must start with a letter or number and contain only letters, numbers, underscores, or hyphens.';

export const getLocalApplicationIdValidationError = (
  value: unknown,
  fieldName = 'local application id',
): string | null => {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string.`;
  }
  const normalized = value.trim();
  if (!normalized) {
    return `${fieldName} is required.`;
  }
  if (!LOCAL_APPLICATION_ID_PATTERN.test(normalized)) {
    return `${fieldName} ${LOCAL_APPLICATION_ID_RULE_DESCRIPTION}`;
  }
  return null;
};

export const normalizeLocalApplicationId = (
  value: unknown,
  fieldName = 'local application id',
): string => {
  const error = getLocalApplicationIdValidationError(value, fieldName);
  if (error) {
    throw new Error(error);
  }
  return (value as string).trim();
};
