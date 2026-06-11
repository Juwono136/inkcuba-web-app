export {
  getEmailTransporter,
  sendEmail,
  checkEmailHealth,
  type SendEmailOptions,
} from "@/lib/email/client";
export {
  buildEmailLayout,
  verificationEmailTemplate,
  resetPasswordEmailTemplate,
} from "@/lib/email/templates";
