export {
  getEmailTransporter,
  sendEmail,
  checkEmailHealth,
  type SendEmailOptions,
} from "@/lib/email/client";
export { escapeHtml } from "@/lib/email/escape";
export { buildEmailLayout } from "@/lib/email/layout";
export {
  verificationEmailTemplate,
  verificationEmailText,
  resetPasswordEmailTemplate,
  resetPasswordEmailText,
  passwordChangedEmailTemplate,
  passwordChangedEmailText,
} from "@/lib/email/templates";
export { sendVerificationEmail } from "@/lib/email/services/verification";
export { sendResetPasswordEmail } from "@/lib/email/services/reset-password";
export { sendPasswordChangedEmail } from "@/lib/email/services/password-changed";
