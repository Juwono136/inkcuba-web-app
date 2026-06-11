export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, and 1 number";

export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least 1 lowercase letter",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least 1 uppercase letter",
    };
  }

  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least 1 number",
    };
  }

  return { valid: true };
}

export function getPasswordRequirementChecks(password: string) {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}
