using SendGrid;
using SendGrid.Helpers.Mail;

namespace TwinPeaks.API.Services
{
    public class EmailService(IConfiguration config)
    {
        public async Task SendPasswordResetAsync(string toEmail, string resetLink)
        {
            var client = new SendGridClient(config["SendGrid__ApiKey"]);
            var from = new EmailAddress(config["SendGrid__FromEmail"], config["SendGrid__FromName"]);
            var to = new EmailAddress(toEmail);
            var msg = MailHelper.CreateSingleEmail(
                from, to,
                subject: "Reset your Twin Peaks Account password",
                plainTextContent: $"Reset your password: {resetLink} (expires in 1 hour)",
                htmlContent: $"""
                    <p>Click the link below to reset your password. It expires in 1 hour.</p>
                    <p><a href="{resetLink}">Reset Password</a></p>
                    <p>If you didn't request this, you can ignore this email.</p>
                    """
            );
            await client.SendEmailAsync(msg);
        }
    }
}